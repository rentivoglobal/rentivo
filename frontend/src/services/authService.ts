import { User, UserRole } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase, extractEdgeFunctionError } from '../lib/supabase';
import { APP_URL } from '../lib/config';
import { localStore, roleFromSignup } from './localStore';
import { renterProfileService } from './renterProfileService';

function mapProfile(row: {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  agency_name?: string | null;
  created_at?: string;
}): User {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    agencyName: row.agency_name || undefined,
    favorites: [],
    createdAt: row.created_at
  };
}

let cachedUser: User | null = null;

async function fetchProfile(userId: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  const profile = mapProfile(data as never);
  cachedUser = profile;
  return profile;
}

export const authService = {
  getCurrentUser(): User | null {
    if (!isLiveBackend) return localStore.getSession();
    return cachedUser;
  },

  async getSessionUser(): Promise<User | null> {
    if (!isLiveBackend) return localStore.getSession();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      cachedUser = null;
      return null;
    }
    return fetchProfile(data.session.user.id);
  },

  isLister(user?: User | null): boolean {
    const u = user ?? this.getCurrentUser();
    return u ? u.role === 'landlord' || u.role === 'agent' : false;
  },

  isAdmin(user?: User | null): boolean {
    const u = user ?? this.getCurrentUser();
    return u ? u.role === 'admin' : false;
  },

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!isLiveBackend) {
      const users = localStore.getUsers();
      const matched = Object.values(users).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!matched || (matched.password && matched.password !== password)) {
        return { success: false, error: 'Invalid email or password.' };
      }
      const { password: _pw, ...user } = matched;
      localStore.setSession(user);
      return { success: true, user };
    }
    if (!supabase) return { success: false, error: 'Authentication is not configured.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { success: false, error: error?.message || 'Failed to sign in.' };
    const profile = await fetchProfile(data.user.id);
    if (profile && (profile.role === 'tenant' || profile.role === 'business_renter')) {
      void renterProfileService.syncGuestProfile(profile.id);
    }
    return { success: true, user: profile || undefined };
  },

  async signup(input: {
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    agencyName?: string;
    password?: string;
  }): Promise<{ success: boolean; user?: User; error?: string; needsConfirmation?: boolean }> {
    const role = roleFromSignup(input.role);
    const cleanEmail = input.email.trim().toLowerCase();

    if (!isLiveBackend) {
      const users = localStore.getUsers();
      if (Object.values(users).some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'An account with this email already exists. Sign in instead.' };
      }
      const user: User & { password?: string } = {
        id: localStore.createId('usr'),
        name: input.fullName.trim(),
        email: cleanEmail,
        phone: input.phone.trim(),
        role,
        agencyName: input.agencyName?.trim(),
        favorites: [],
        createdAt: new Date().toISOString(),
        password: input.password
      };
      users[user.id] = user;
      localStore.saveUsers(users);
      return { success: true, needsConfirmation: true };
    }
    if (!supabase) return { success: false, error: 'Authentication is not configured.' };

    // 1. Native Supabase Auth Sign Up (triggers confirm-signup email with 6-digit OTP code)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: input.password || '',
      options: {
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          role,
          agency_name: input.agencyName?.trim() || ''
        }
      }
    });

    if (signUpErr) {
      const msg = signUpErr.message || '';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('user already exists') ||
        (signUpErr as any).status === 422
      ) {
        return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
      }

      // Fallback: If client signup is disabled or restricted, invoke auth-signup edge function
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('auth-signup', {
        body: {
          email: cleanEmail,
          password: input.password || '',
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          role,
          agencyName: input.agencyName?.trim() || ''
        }
      });

      if (edgeErr || edgeRes?.error || edgeRes?.success === false) {
        let errorMsg = edgeRes?.error;
        if (!errorMsg && edgeErr) {
          errorMsg = await extractEdgeFunctionError(edgeErr, 'Failed to create account.');
        }
        return { success: false, error: errorMsg || signUpErr.message || 'Failed to create account.' };
      }

      return { success: true, needsConfirmation: true };
    }

    // If email confirmation is required (Supabase returns session: null)
    if (signUpData?.user && !signUpData.session) {
      return { success: true, needsConfirmation: true };
    }

    // If confirmation was disabled or session was established immediately
    if (signUpData?.session?.user) {
      const profile = await fetchProfile(signUpData.session.user.id);
      if (profile && (profile.role === 'tenant' || profile.role === 'business_renter')) {
        void renterProfileService.syncGuestProfile(profile.id);
      }
      return { success: true, needsConfirmation: false, user: profile || undefined };
    }

    return { success: true, needsConfirmation: true };
  },

  async verifySignupCode(email: string, token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!isLiveBackend || !supabase) {
      const users = localStore.getUsers();
      const matched = Object.values(users).find(u => u.email.toLowerCase() === cleanEmail);
      const user: User = matched ? {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        phone: matched.phone,
        role: matched.role,
        agencyName: matched.agencyName,
        favorites: matched.favorites || [],
        createdAt: matched.createdAt
      } : {
        id: localStore.createId('usr'),
        name: 'Rentivo Member',
        email: cleanEmail,
        phone: '',
        role: 'tenant',
        favorites: [],
        createdAt: new Date().toISOString()
      };
      localStore.setSession(user);
      return { success: true, user };
    }

    // Try type: 'signup'
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup'
    });

    // If 'signup' fails, fallback try 'email' (some Supabase email configs use 'email' OTP)
    if (error) {
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email'
      });
      if (!retry.error && retry.data?.user) {
        data = retry.data;
        error = null;
      }
    }

    if (error || !data?.user) {
      return {
        success: false,
        error: error?.message || 'Invalid or expired verification code. Please check your email or request a new code.'
      };
    }

    const profile = await fetchProfile(data.user.id);
    if (profile && (profile.role === 'tenant' || profile.role === 'business_renter')) {
      void renterProfileService.syncGuestProfile(profile.id);
    }

    return { success: true, user: profile || undefined };
  },

  async verifyLoginCode(email: string, token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!isLiveBackend || !supabase) {
      const users = localStore.getUsers();
      const matched = Object.values(users).find(u => u.email.toLowerCase() === cleanEmail);
      const user: User = matched ? {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        phone: matched.phone,
        role: matched.role,
        agencyName: matched.agencyName,
        favorites: matched.favorites || [],
        createdAt: matched.createdAt
      } : {
        id: localStore.createId('usr'),
        name: 'Rentivo Member',
        email: cleanEmail,
        phone: '',
        role: 'tenant',
        favorites: [],
        createdAt: new Date().toISOString()
      };
      localStore.setSession(user);
      return { success: true, user };
    }

    // Try type: 'email'
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email'
    });

    // Fallback try type: 'magiclink'
    if (error) {
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'magiclink'
      });
      if (!retry.error && retry.data?.user) {
        data = retry.data;
        error = null;
      }
    }

    if (error || !data?.user) {
      return {
        success: false,
        error: error?.message || 'Invalid or expired login code. Please request a new code.'
      };
    }

    const profile = await fetchProfile(data.user.id);
    if (profile && (profile.role === 'tenant' || profile.role === 'business_renter')) {
      void renterProfileService.syncGuestProfile(profile.id);
    }

    return { success: true, user: profile || undefined };
  },

  async sendLoginCode(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!isLiveBackend || !supabase) {
      return { success: true };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${APP_URL}/auth/callback`
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async resendVerificationCode(email: string, type: 'signup' | 'login'): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!isLiveBackend || !supabase) {
      return { success: true };
    }
    if (type === 'signup') {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${APP_URL}/auth/callback`
        }
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isLiveBackend || !supabase) {
      return { success: false, error: 'Magic links require Supabase Auth. Use email and password locally.' };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${APP_URL}/auth/callback` }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isLiveBackend || !supabase) {
      return { success: true };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${APP_URL}/reset-password`
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updatePassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!isLiveBackend || !supabase) {
      const session = localStore.getSession();
      if (!session) return { success: false, error: 'No active reset session.' };
      const users = localStore.getUsers();
      if (users[session.id]) {
        users[session.id].password = password;
        localStore.saveUsers(users);
      }
      return { success: true };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateProfile(name: string, phone: string, email: string, extras?: { preferredArea?: string; emailAlerts?: boolean }): Promise<User | null> {
    if (!isLiveBackend) {
      const user = localStore.getSession();
      if (!user) return null;
      const updated = { ...user, name, phone, email };
      localStore.setSession(updated);
      const users = localStore.getUsers();
      if (users[user.id]) {
        users[user.id] = { ...users[user.id], ...updated };
        localStore.saveUsers(users);
      }
      return updated;
    }
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;
    const { error } = await supabase
      .from('users')
      .update({
        full_name: name,
        phone,
        email,
        preferred_area: extras?.preferredArea,
        email_alerts: extras?.emailAlerts,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    if (error) throw error;
    return fetchProfile(userId);
  },

  async listUsers(): Promise<User[]> {
    if (!isLiveBackend || !supabase) return Object.values(localStore.getUsers());
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Failed to list users from Supabase:', error);
      return [];
    }
    return (data || []).map((row) => mapProfile(row as never));
  },

  async logout(): Promise<void> {
    cachedUser = null;
    if (isLiveBackend && supabase) {
      await supabase.auth.signOut();
    }
    localStore.setSession(null);
  },

  async adminLogin(_passcode: string): Promise<boolean> {
    return false;
  },

  switchRole(_role: UserRole): User {
    throw new Error('Role switching is disabled. Sign in with the correct account.');
  }
};
