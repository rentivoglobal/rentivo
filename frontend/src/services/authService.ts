import { User, UserRole } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { APP_URL } from '../lib/config';
import { localStore, roleFromSignup } from './localStore';

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

async function fetchProfile(userId: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return mapProfile(data as never);
}

export const authService = {
  getCurrentUser(): User | null {
    if (!isLiveBackend) return localStore.getSession();
    return null;
  },

  async getSessionUser(): Promise<User | null> {
    if (!isLiveBackend) return localStore.getSession();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
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
    if (!isLiveBackend) {
      const users = localStore.getUsers();
      if (Object.values(users).some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
        return { success: false, error: 'An account with this email already exists. Sign in instead.' };
      }
      const user: User & { password?: string } = {
        id: localStore.createId('usr'),
        name: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        role,
        agencyName: input.agencyName?.trim(),
        favorites: [],
        createdAt: new Date().toISOString(),
        password: input.password
      };
      users[user.id] = user;
      localStore.saveUsers(users);
      const { password: _pw, ...sessionUser } = user;
      localStore.setSession(sessionUser);
      return { success: true, user: sessionUser };
    }
    if (!supabase) return { success: false, error: 'Authentication is not configured.' };
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password || '',
      options: {
        emailRedirectTo: `${APP_URL}/auth/callback`,
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          role,
          agency_name: input.agencyName || ''
        }
      }
    });
    if (error) return { success: false, error: error.message };
    if (!data.session) {
      return { success: true, needsConfirmation: true };
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    return { success: true, user: profile || undefined };
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

  async logout(): Promise<void> {
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
