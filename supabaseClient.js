import { createClient } from '@supabase/supabase-js';

const defaultUrl = "https://zjnnntxndwpfynpjrqey.supabase.co";
const defaultKey = "sb_publishable_WM2GM8xsI7EZnpuF2cv5iQ_HvIiQQPQ";

const rawUrl = import.meta.env?.VITE_SUPABASE_URL || defaultUrl;
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || defaultKey;

// Sanitize URL to ensure standard Supabase origin (removes /rest/v1 suffix or trailing slashes)
const sanitizeUrl = (urlStr) => {
  if (!urlStr) return "";
  let clean = urlStr.trim();
  clean = clean.replace(/\/rest\/v1\/?$/, "");
  clean = clean.replace(/\/+$/, "");
  return clean;
};

const cleanUrl = sanitizeUrl(rawUrl);

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const isConfigured = isValidUrl(cleanUrl) && Boolean(rawKey) && !rawKey.includes("PUBLISHABLE_KEY");

let supabaseClient;

if (isConfigured) {
  try {
    supabaseClient = createClient(cleanUrl, rawKey);
  } catch (err) {
    console.error("Failed to initialize Supabase client with provided credentials:", err);
  }
}

if (!supabaseClient) {
  console.warn(
    "Supabase credentials are not configured or invalid. " +
    "Puceal is running in offline demo mode using localStorage for mock authentication."
  );

  supabaseClient = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        const users = JSON.parse(localStorage.getItem("puceal_mock_users") || "[]");
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
          return {
            data: {
              user: {
                id: user.id,
                email: user.email,
                user_metadata: {
                  display_name: user.display_name
                }
              }
            },
            error: null
          };
        } else {
          return {
            data: { user: null },
            error: { message: "Invalid login credentials. (Offline Demo Mode)" }
          };
        }
      },
      signUp: async ({ email, password, options }) => {
        const users = JSON.parse(localStorage.getItem("puceal_mock_users") || "[]");
        if (users.some(u => u.email === email)) {
          return {
            data: { user: null },
            error: { message: "An account with this email already exists. (Offline Demo Mode)" }
          };
        }
        const displayName = options?.data?.display_name || "Learner";
        const newUser = {
          id: "mock_" + Math.random().toString(36).substring(2, 10),
          email,
          password,
          display_name: displayName
        };
        users.push(newUser);
        localStorage.setItem("puceal_mock_users", JSON.stringify(users));
        return {
          data: {
            user: {
              id: newUser.id,
              email: newUser.email,
              user_metadata: {
                display_name: newUser.display_name
              }
            }
          },
          error: null
        };
      },
      getUser: async () => {
        const session = localStorage.getItem("puceal_current_user");
        if (session) {
          try {
            const user = JSON.parse(session);
            return { data: { user }, error: null };
          } catch (_) {}
        }
        return { data: { user: null }, error: { message: "Not authenticated" } };
      },
      getSession: async () => {
        const session = localStorage.getItem("puceal_current_user");
        if (session) {
          try {
            const user = JSON.parse(session);
            return { data: { session: { user } }, error: null };
          } catch (_) {}
        }
        return { data: { session: null }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      updateUser: async (attributes) => {
        return { data: { user: null }, error: null };
      }
    },
    from: (tableName) => {
      const getMockData = () => JSON.parse(localStorage.getItem(`puceal_mock_${tableName}`) || "[]");
      /** @type {any} */
      const builder = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        eq: () => builder,
        maybeSingle: () => Promise.resolve({ data: getMockData()[0] || null, error: null }),
        single: () => Promise.resolve({ data: getMockData()[0] || null, error: null }),
        then: (resolve) => resolve({ data: getMockData(), error: null })
      };
      return {
        ...builder,
        insert: (rows) => {
          const current = getMockData();
          const updated = [...rows, ...current];
          localStorage.setItem(`puceal_mock_${tableName}`, JSON.stringify(updated));
          return Promise.resolve({ data: rows, error: null });
        }
      };
    }
  };
}

export const supabase = supabaseClient;


