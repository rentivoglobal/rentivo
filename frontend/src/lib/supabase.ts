import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLiveBackend } from './config';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = isLiveBackend
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

/**
 * Extracts a human-friendly error message from an Edge Function error,
 * resolving the underlying JSON or text response body if present.
 */
export async function extractEdgeFunctionError(error: unknown, fallback = 'Operation failed.'): Promise<string> {
  if (!error) return fallback;
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    // Check if error has a Response context (FunctionsHttpError)
    if (errObj.context && typeof errObj.context.json === 'function') {
      try {
        const body = await errObj.context.json();
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch {
        try {
          const text = await errObj.context.text();
          if (text) return text;
        } catch {
          // ignore
        }
      }
    }
    if (errObj.message && errObj.message !== 'Edge Function returned a non-2xx status code') {
      return errObj.message;
    }
  }
  return fallback;
}

