import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.');
  return supabase;
}

export function readableError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  if (/Invalid login credentials/i.test(error.message)) return 'Email or password is incorrect.';
  if (/User already registered/i.test(error.message)) return 'An account with this email already exists. Log in instead.';
  if (/Email not confirmed/i.test(error.message)) return 'Confirm your email using the link we sent before logging in.';
  return error.message || 'Something went wrong. Please try again.';
}
