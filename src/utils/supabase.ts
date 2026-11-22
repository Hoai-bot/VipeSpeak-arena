// E:\DuAnAI\VipeSpeak-arena\src\utils\supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hdifryokbfssibhsnpja.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaWZyeW9rYmZzc2liaHNucGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDI5MTUsImV4cCI6MjEwMzc3ODkxNX0.z0Cq9HGZkGHW4xBVlUxT3O7AnDiE7HxM0h8EeuqaG_A';

declare global {
  var __vibespeakArenaSupabaseClient: SupabaseClient | undefined;
}

if (!globalThis.__vibespeakArenaSupabaseClient) {
  globalThis.__vibespeakArenaSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'vibespeak_arena_auth_token',
    },
    global: {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    },
  });
}

export const supabase = globalThis.__vibespeakArenaSupabaseClient;