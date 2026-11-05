import { User, UserRole } from '../types';
import { APP_URL, isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore, roleFromSignup } from './localStore';
import { renterProfileService } from './renterProfileService';

const RECOVERY_SESSION_KEY = 'rentivo:password-recovery';

function currentAppOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : APP_URL;
}

function appRedirect(pathOrUrl = '/auth/callback'): string {
  const origin = currentAppOrigin().replace(/\/+$/, '');
  try {
    const target = new URL(pathOrUrl, `${origin}/`);
    return target.origin === origin ? target.toString() : `${origin}/auth/callback`;
  } catch {
    return `${origin}/auth/callback`;
  }
}

function markRecoverySession(): void {
  try {
    window.sessionStorage.setItem(RECOVERY_SESSION_KEY, '1');
  } catch {
    // The recovery check will fail closed when browser storage is unavailable.
  }
}

function clearRecoverySession(): void {
  try {
    window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}

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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (!isLiveBackend) {
      const users = localStore.getUsers();
      const matched = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);
      if (!matched) {
        return { success: false, error: 'Invalid email or password.' };
      }
      localStore.setSession(matched);
      return { success: true, user: matched };
    }
    if (!supabase) return { success: false, error: 'Authentication is not configured.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) {
      const message = error?.message || '';
      if (message.toLowerCase().includes('email not confirmed') || message.toLowerCase().includes('email_not_confirmed')) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: { emailRedirectTo: appRedirect('/auth/callback') }
        });
        if (!resendError) {
          return { success: false, error: `Your email is not confirmed yet. Supabase accepted a request for a fresh confirmation email to ${cleanEmail}. Check your inbox and spam folder.` };
        }
        return { success: false, error: 'Your email is not confirmed yet. Request a fresh verification code from the confirmation page.' };
      }
      return { success: false, error: message || 'Failed to sign in.' };
    }
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
    emailRedirectTo?: string;
  }): Promise<{ success: boolean; user?: User; error?: string; needsConfirmation?: boolean }> {
    // Whitelist allowed public signup roles (strictly prevent admin role escalation)
    const ALLOWED_SIGNUP_ROLES: UserRole[] = ['tenant', 'landlord', 'agent', 'business_renter'];
    const role: UserRole = ALLOWED_SIGNUP_ROLES.includes(input.role) ? roleFromSignup(input.role) : 'tenant';
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();
    const cleanPhone = input.phone.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!input.password || input.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (!isLiveBackend) {
      const users = localStore.getUsers();
      if (Object.values(users).some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'An account with this email already exists. Sign in instead.' };
      }
      const user: User = {
        id: localStore.createId('usr'),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role,
        agencyName: input.agencyName?.trim(),
        favorites: [],
        createdAt: new Date().toISOString()
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
          full_name: cleanName,
          phone: cleanPhone,
          role,
          agency_name: input.agencyName?.trim() || ''
        },
        emailRedirectTo: appRedirect(input.emailRedirectTo || '/auth/callback')
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

      return { success: false, error: signUpErr.message || 'Failed to create account. Please try again.' };
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
    const cleanToken = token.replace(/\D/g, '').trim();

    // 1. Strict 6-digit validation
    if (cleanToken.length !== 6) {
      return { success: false, error: 'Verification code must be exactly 6 digits.' };
    }

    if (!isLiveBackend || !supabase) {
      // In local demo mode, only accept demo code '123456'
      if (cleanToken !== '123456') {
        return { success: false, error: 'Invalid verification code. (Demo code is 123456)' };
      }
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

    // 2. Real Supabase verification (type: 'signup')
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
    const cleanToken = token.replace(/\D/g, '').trim();

    // 1. Strict 6-digit validation
    if (cleanToken.length !== 6) {
      return { success: false, error: 'Login code must be exactly 6 digits.' };
    }

    if (!isLiveBackend || !supabase) {
      // In local demo mode, only accept demo code '123456'
      if (cleanToken !== '123456') {
        return { success: false, error: 'Invalid login code. (Demo code is 123456)' };
      }
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

    // 2. Real Supabase verification (type: 'email')
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
        emailRedirectTo: appRedirect('/auth/callback')
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async resendVerificationCode(email: string, type: 'signup' | 'login', redirectTo?: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!isLiveBackend || !supabase) {
      return { success: true };
    }
    if (type === 'signup') {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: { emailRedirectTo: appRedirect(redirectTo || '/auth/callback') }
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: appRedirect('/auth/callback')
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
      options: { emailRedirectTo: appRedirect('/auth/callback') }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async requestPasswordReset(email: string, redirectPath = '/reset-password'): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!isLiveBackend || !supabase) {
      return { success: true };
    }
    const safeRedirectPath = redirectPath.startsWith('/') && !redirectPath.startsWith('//')
      ? redirectPath
      : '/reset-password';
    const redirectTo = appRedirect(safeRedirectPath);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async hasActiveRecoverySession(): Promise<boolean> {
    if (!isLiveBackend || !supabase) {
      return Boolean(localStore.getSession());
    }
    const client = supabase;
    try {
      const { data } = await client.auth.getSession();
      if (data.session?.user && window.sessionStorage.getItem(RECOVERY_SESSION_KEY) === '1') return true;

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let subscription: { unsubscribe: () => void } | null = null;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const finish = (valid: boolean) => {
          if (settled) return;
          settled = true;
          if (timeout) clearTimeout(timeout);
          subscription?.unsubscribe();
          resolve(valid);
        };

        const listener = client.auth.onAuthStateChange((event, session) => {
          if (session?.user && event === 'PASSWORD_RECOVERY') {
            markRecoverySession();
            finish(true);
          }
        });
        subscription = listener.data.subscription;
        if (settled) subscription.unsubscribe();

        if (!settled) {
          timeout = setTimeout(() => {
            void client.auth.getSession()
              .then(({ data: latest }) => finish(
                Boolean(latest.session?.user && window.sessionStorage.getItem(RECOVERY_SESSION_KEY) === '1')
              ))
              .catch(() => finish(false));
          }, 5000);
        }
      });
    } catch {
      return false;
    }
  },

  async updatePassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!password || password.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    if (!isLiveBackend || !supabase) {
      const session = localStore.getSession();
      if (!session) return { success: false, error: 'No active reset session. Please request a new reset link.' };
      return { success: true };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: error.message || 'Failed to update password. Reset link may have expired.' };
    clearRecoverySession();
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
