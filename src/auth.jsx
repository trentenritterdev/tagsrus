import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { requireSupabase, supabase, supabaseConfigured } from './supabase';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(data?.session ?? null);
        setLoading(false);
        if (error) console.error('Unable to restore Supabase session:', error.message);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-page"><p className="notice">Loading your account…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, allowed: false, error: '' });
  useEffect(() => {
    let active = true;
    setState({ loading: true, allowed: false, error: '' });
    requireSupabase().rpc('is_tagsrus_admin').then(({ data, error }) => {
      if (active) setState({ loading: false, allowed: data === true, error: error?.message || '' });
    }).catch(error => {
      if (active) setState({ loading: false, allowed: false, error: error.message || 'Admin access could not be checked.' });
    });
    return () => { active = false; };
  }, [user.id]);
  if (state.loading) return <div className="dashboard-page"><main><div className="container dashboard-main"><p>Checking admin access…</p></div></main></div>;
  if (!state.allowed) return <div className="dashboard-page"><main><div className="container dashboard-main"><h1>Admin access required</h1><p className="form-error">{state.error || 'This account has not been assigned the admin role in Supabase.'}</p><Link to="/dashboard">Back to My tags</Link></div></main></div>;
  return children;
}

export async function ensureUserProfile(user) {
  const client = requireSupabase();
  const { data: profile, error: readError } = await client.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (readError) throw readError;
  if (profile) return;
  const { error } = await client.from('profiles').insert({
    id: user.id,
    owner_id: user.id,
    person_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'My profile',
    privacy_acknowledged_at: new Date().toISOString(),
    privacy_acknowledgement_version: '2026-11-11',
    customer_acknowledged_at: new Date().toISOString(),
  });
  if (error) throw error;
}
