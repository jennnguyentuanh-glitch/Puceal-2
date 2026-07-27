-- ====================================================================
-- SUPABASE COMPLETE PRODUCTION DATABASE SCHEMA & RLS POLICIES
-- Application: Puceal - 1-on-1 English Video Exchange & AI Buddy
-- Features: My Notebook, Matching Engine, Donations, Live Presence
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABLE CREATION
-- --------------------------------------------------------------------

-- A. Notes / Notebook Table (Bookmark prompts & reflection notes)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_prompt TEXT,
    user_reflection TEXT,
    mode TEXT CHECK (mode IN ('discuss', 'debate')),
    partner_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B. Matches / Call History Table (Completed video exchange sessions)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    room_id TEXT NOT NULL,
    mode TEXT CHECK (mode IN ('discuss', 'debate')),
    duration_seconds INTEGER NOT NULL DEFAULT 300,
    status TEXT CHECK (status IN ('completed', 'skipped', 'disconnected')),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C. Donations Table (Voluntary user payments / support)
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous donations
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status TEXT CHECK (status IN ('pending', 'success', 'failed')),
    transaction_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D. Live Online Presence Table (Real-time active user count)
CREATE TABLE IF NOT EXISTS public.presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('idle', 'in_queue', 'in_call')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- E. Entries / Speaking History Table (Session logs & practice entries)
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    topic TEXT,
    duration TEXT DEFAULT '5 mins',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F. User Streaks Table (Tracks daily practice streak & activity dates)
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    activity_history TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- 1. Notes Policies (Authenticated users can INSERT & SELECT their own notes)
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes" ON public.notes 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes 
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes 
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Matches Policies (Authenticated users can log & view match records)
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
CREATE POLICY "Users can insert matches" ON public.matches 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;
CREATE POLICY "Users can view their matches" ON public.matches 
FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 3. Donations Policies (Allow public & authenticated users to submit donations)
DROP POLICY IF EXISTS "Anyone can insert donations" ON public.donations;
CREATE POLICY "Anyone can insert donations" ON public.donations 
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
CREATE POLICY "Users can view own donations" ON public.donations 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Presence Policies (Public read for online counter, authenticated upsert for status)
DROP POLICY IF EXISTS "Anyone can read presence" ON public.presence;
CREATE POLICY "Anyone can read presence" ON public.presence 
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage presence" ON public.presence;
CREATE POLICY "Users can manage presence" ON public.presence 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Entries Policies (Users manage their own practice history)
DROP POLICY IF EXISTS "Users can insert their own entries" ON public.entries;
CREATE POLICY "Users can insert their own entries" ON public.entries 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own entries" ON public.entries;
CREATE POLICY "Users can view their own entries" ON public.entries 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. User Streaks Policies (Users view and update their own streak record)
DROP POLICY IF EXISTS "Users can view their own streak" ON public.user_streaks;
CREATE POLICY "Users can view their own streak" ON public.user_streaks 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own streak" ON public.user_streaks;
CREATE POLICY "Users can update their own streak" ON public.user_streaks 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_participants ON public.matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.presence(last_seen);

-- --------------------------------------------------------------------
-- 4. AUTOMATIC STREAK UPDATE TRIGGER FUNCTION
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_user_streak_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_date DATE;
    curr_streak INTEGER := 0;
    history TEXT[];
    today_str TEXT := CURRENT_DATE::text;
BEGIN
    -- Check existing streak for user
    SELECT last_activity_date, current_streak, activity_history
    INTO last_date, curr_streak, history
    FROM public.user_streaks
    WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
        -- First time entry: initialize streak at 1 and record calendar day
        INSERT INTO public.user_streaks (user_id, current_streak, last_activity_date, activity_history, updated_at)
        VALUES (NEW.user_id, 1, CURRENT_DATE, ARRAY[today_str], NOW());
    ELSE
        -- Ensure today's date string is recorded in activity_history array
        IF history IS NULL OR NOT (today_str = ANY(history)) THEN
            history := array_append(COALESCE(history, ARRAY[]::TEXT[]), today_str);
        END IF;

        IF last_date = CURRENT_DATE THEN
            -- Already completed an activity today: keep current_streak unchanged, record history
            UPDATE public.user_streaks
            SET activity_history = history,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
            -- Completed yesterday: increment current_streak by 1
            UPDATE public.user_streaks
            SET current_streak = curr_streak + 1,
                last_activity_date = CURRENT_DATE,
                activity_history = history,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSE
            -- Missed days (before yesterday): reset current_streak to 1
            UPDATE public.user_streaks
            SET current_streak = 1,
                last_activity_date = CURRENT_DATE,
                activity_history = history,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on entries table
DROP TRIGGER IF EXISTS trigger_update_user_streak ON public.entries;
CREATE TRIGGER trigger_update_user_streak
AFTER INSERT ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.update_user_streak_on_activity();

-- --------------------------------------------------------------------
-- 4. HELPER FUNCTIONS & VIEWS
-- --------------------------------------------------------------------

-- Function to prune stale presence rows (inactive > 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$;
