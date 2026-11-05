import { User, AdminInvitation, AdminRoleTier } from '../types';
import { isLiveBackend, APP_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { authService } from './authService';
import { emailNotificationService } from './emailNotificationService';

function buildInviteUrl(token: string, email: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : APP_URL;
  return `${base.replace(/\/+$/, '')}/admin/invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

function buildInviteConfirmationUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : APP_URL;
  const callback = new URL('/auth/callback', `${base.replace(/\/+$/, '')}/`);
  callback.searchParams.set('adminInviteToken', token);
  return callback.toString();
}

function createInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const adminService = {
  /**
   * Fetch all active administrators
   */
  async getAdmins(): Promise<User[]> {
    if (!isLiveBackend || !supabase) {
      const users = localStore.getUsers();
      return Object.values(users).filter(u => u.role === 'admin');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load admins from Supabase, checking localStore:', error);
        const users = localStore.getUsers();
        return Object.values(users).filter(u => u.role === 'admin');
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.full_name || 'Rentivo Admin',
        email: row.email,
        phone: row.phone || row.whatsapp || '',
        role: 'admin' as const,
        agencyName: row.agency_name || undefined,
        favorites: [],
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Error fetching admins:', err);
      const users = localStore.getUsers();
      return Object.values(users).filter(u => u.role === 'admin');
    }
  },

  /**
   * Fetch all admin invitations (pending, accepted, revoked, expired)
   */
  async getInvitations(): Promise<AdminInvitation[]> {
    if (!isLiveBackend || !supabase) {
      return localStore.getAdminInvitations();
    }

    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch admin invitations from Supabase:', error);
        return localStore.getAdminInvitations();
      }

      return (data || []).map(row => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role as AdminRoleTier,
        token: row.token,
        invitedBy: row.invited_by,
        invitedByName: row.invited_by_name,
        notes: row.notes,
        status: row.status,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (err) {
      console.error('Error fetching admin invitations:', err);
      return localStore.getAdminInvitations();
    }
  },

  /**
   * Create and dispatch a new admin invitation
   */
  async createInvitation(input: {
    email: string;
    fullName: string;
    role: AdminRoleTier;
    notes?: string;
  }): Promise<{ success: boolean; invitation?: AdminInvitation; inviteUrl?: string; error?: string; emailError?: string }> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Please enter the invitee\'s full name.' };
    }

    // Check if user is already an active administrator
    const currentAdmins = await this.getAdmins();
    if (currentAdmins.some(a => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A team member with this email is already an active Administrator.' };
    }

    const currentAdminUser = authService.getCurrentUser();
    let token: string;
    try {
      token = createInvitationToken();
    } catch {
      return { success: false, error: 'Secure invitation token generation is unavailable in this browser.' };
    }
    const inviteUrl = buildInviteUrl(token, cleanEmail);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newInvitation: AdminInvitation = {
      id: localStore.createId('inv'),
      email: cleanEmail,
      fullName: cleanName,
      role: input.role || 'admin',
      token,
      invitedBy: currentAdminUser?.id,
      invitedByName: currentAdminUser?.name || 'Rentivo Admin',
      notes: input.notes?.trim() || undefined,
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString()
    };

    if (isLiveBackend) {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      try {
        const { data, error } = await supabase
          .from('admin_invitations')
          .insert({
            email: cleanEmail,
            full_name: cleanName,
            role: input.role || 'admin',
            token,
            invited_by: currentAdminUser?.id,
            invited_by_name: currentAdminUser?.name || 'Rentivo Admin',
            notes: input.notes?.trim() || null,
            status: 'pending',
            expires_at: expiresAt
          })
          .select()
          .single();

        if (error || !data) {
          return { success: false, error: error?.message || 'Invitation could not be saved to the Rentivo database.' };
        }
        newInvitation.id = data.id;
      } catch (err: any) {
        return { success: false, error: err?.message || 'Invitation could not be saved to the Rentivo database.' };
      }
    } else {
      localStore.saveAdminInvitation(newInvitation);
    }

    let emailError: string | undefined;

    // Dispatch invitation email via Brevo / Edge Function pipeline
    try {
      const emailRes = await emailNotificationService.sendAdminInvitationEmail({
        recipientEmail: cleanEmail,
        recipientName: cleanName,
        invitedByName: currentAdminUser?.name || 'Rentivo Operations',
        role: input.role,
        inviteUrl,
        notes: input.notes?.trim()
      });

      if (!emailRes.success) {
        emailError = emailRes.error || 'Email dispatch failed';
      }
    } catch (err: any) {
      emailError = err?.message || 'Email delivery exception';
    }

    return {
      success: true,
      invitation: newInvitation,
      inviteUrl,
      emailError
    };
  },

  /**
   * Resend an invitation email and refresh its 7-day expiration
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; inviteUrl?: string; error?: string }> {
    const invitations = await this.getInvitations();
    const inv = invitations.find(i => i.id === invitationId);
    if (!inv) return { success: false, error: 'Invitation not found.' };
    if (inv.status === 'accepted' || inv.status === 'revoked') {
      return { success: false, error: `A ${inv.status} invitation cannot be resent.` };
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviteUrl = buildInviteUrl(inv.token, inv.email);

    if (isLiveBackend) {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      try {
        const { error } = await supabase
          .from('admin_invitations')
          .update({
            expires_at: newExpiresAt,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', invitationId);
        if (error) return { success: false, error: error.message };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Could not refresh invitation expiry.' };
      }
    } else {
      localStore.updateAdminInvitation(invitationId, { expiresAt: newExpiresAt, status: 'pending' });
    }

    // Send email again
    const emailRes = await emailNotificationService.sendAdminInvitationEmail({
      recipientEmail: inv.email,
      recipientName: inv.fullName,
      invitedByName: inv.invitedByName || 'Rentivo Operations',
      role: inv.role,
      inviteUrl,
      notes: inv.notes
    });

    if (!emailRes.success) {
      return { success: false, inviteUrl, error: `The invitation expiry was refreshed, but the email was not delivered: ${emailRes.error}` };
    }

    return { success: true, inviteUrl };
  },

  /**
   * Revoke a pending invitation so it can no longer be used
   */
  async revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    if (isLiveBackend && supabase) {
      try {
        const { error } = await supabase
          .from('admin_invitations')
          .update({
            status: 'revoked',
            updated_at: new Date().toISOString()
          })
          .eq('id', invitationId);

        if (error) return { success: false, error: error.message };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to revoke invitation' };
      }
    }
    localStore.updateAdminInvitation(invitationId, { status: 'revoked' });
    return { success: true };
  },

  /**
   * Remove administrator privileges from a user
   */
  async removeAdmin(adminUserId: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id === adminUserId) {
      return { success: false, error: 'You cannot revoke your own administrator account.' };
    }

    const admins = await this.getAdmins();
    if (admins.length <= 1) {
      return { success: false, error: 'Cannot remove the last remaining administrator on the platform.' };
    }

    if (isLiveBackend && supabase) {
      try {
        // Demote user role to 'tenant' in public.users
        const { error } = await supabase
          .from('users')
          .update({ role: 'tenant', updated_at: new Date().toISOString() })
          .eq('id', adminUserId);

        if (error) return { success: false, error: error.message };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to remove administrator' };
      }
    }

    // Update in localStore
    const users = localStore.getUsers();
    if (users[adminUserId]) {
      users[adminUserId].role = 'tenant';
      localStore.saveUsers(users);
    }

    return { success: true };
  },

  /**
   * Public lookup to verify an invitation token before acceptance
   */
  async verifyInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation?: {
      email: string;
      fullName: string;
      role: AdminRoleTier;
      invitedByName?: string;
      notes?: string;
      expiresAt: string;
    };
    error?: string;
  }> {
    if (!token) return { valid: false, error: 'Invitation link is missing token.' };

    if (isLiveBackend) {
      if (!supabase) return { valid: false, error: 'Invitation validation is unavailable. Please try again.' };
      try {
        const { data, error } = await supabase.rpc('get_admin_invitation_by_token', { p_token: token });
        if (error) return { valid: false, error: 'Could not validate this invitation. Please retry.' };
        if (!data?.success) return { valid: false, error: data?.error || 'Invalid or expired invitation token.' };
        return {
          valid: true,
          invitation: {
            email: data.email,
            fullName: data.full_name,
            role: data.role as AdminRoleTier,
            invitedByName: data.invited_by_name,
            notes: data.notes,
            expiresAt: data.expires_at
          }
        };
      } catch (err: any) {
        return { valid: false, error: err?.message || 'Could not validate this invitation. Please retry.' };
      }
    }

    // LocalStore check
    const localInv = localStore.getAdminInvitationByToken(token);
    if (!localInv) {
      return { valid: false, error: 'Invalid invitation link.' };
    }
    if (localInv.status === 'accepted') {
      return { valid: false, error: 'This invitation has already been accepted.' };
    }
    if (localInv.status === 'revoked') {
      return { valid: false, error: 'This invitation has been revoked.' };
    }
    if (new Date(localInv.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'This invitation has expired.' };
    }

    return {
      valid: true,
      invitation: {
        email: localInv.email,
        fullName: localInv.fullName,
        role: localInv.role,
        invitedByName: localInv.invitedByName,
        notes: localInv.notes,
        expiresAt: localInv.expiresAt
      }
    };
  },

  /**
   * Accept an invitation and activate the administrator account
   */
  async acceptInvitation(token: string, input: {
    password?: string;
    phone?: string;
    fullName?: string;
  }): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> {
    const verification = await this.verifyInvitationToken(token);
    if (!verification.valid || !verification.invitation) {
      return { success: false, error: verification.error || 'Invalid invitation.' };
    }

    const { email, fullName } = verification.invitation;
    const finalName = input.fullName?.trim() || fullName;
    const phone = input.phone?.trim() || '';

    if (!isLiveBackend || !supabase) {
      // Mock / Offline mode acceptance
      const users = localStore.getUsers();
      let matched = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        matched = {
          id: localStore.createId('usr'),
          name: finalName,
          email,
          phone,
          role: 'admin',
          favorites: [],
          createdAt: new Date().toISOString()
        };
      } else {
        matched.role = 'admin';
        matched.name = finalName;
        if (phone) matched.phone = phone;
      }
      users[matched.id] = matched;
      localStore.saveUsers(users);
      localStore.setSession(matched);

      const localInv = localStore.getAdminInvitationByToken(token);
      if (localInv) {
        localStore.updateAdminInvitation(localInv.id, {
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        });
      }
      return { success: true };
    }

    // Live Supabase Backend: never promote a role or accept an invite through client-side table writes.
    try {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) return { success: false, error: sessionError.message };
      const activeUser = sessionData.session?.user;

      const acceptForUser = async (userId: string) => {
        const { data, error } = await supabase!.rpc('accept_admin_invitation', {
          p_token: token,
          p_user_id: userId
        });
        if (error) return { success: false, error: error.message };
        if (data?.success !== true) return { success: false, error: data?.error || 'Invitation could not be accepted.' };
        await authService.getSessionUser();
        return { success: true };
      };

      if (activeUser?.email?.trim().toLowerCase() === email.trim().toLowerCase()) {
        return acceptForUser(activeUser.id);
      }

      // If not logged in, but password was provided:
      if (!input.password || input.password.length < 8) {
        return { success: false, error: 'Please choose a secure password of at least 8 characters.' };
      }

      // Try signing in first (in case account exists)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: input.password
      });

      if (!signInErr && signInData?.user) {
        return acceptForUser(signInData.user.id);
      }

      // Create new account via supabase.auth.signUp
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            full_name: finalName,
            phone,
            role: 'tenant'
          },
          emailRedirectTo: buildInviteConfirmationUrl(token)
        }
      });

      if (signUpErr) {
        // If user exists with different password:
        if (signUpErr.message.includes('already registered') || signUpErr.message.includes('already exists')) {
          return { success: false, error: 'An account with this email already exists. Please sign in first, then accept this invite.' };
        }
        return { success: false, error: signUpErr.message };
      }

      if (signUpData.user && !signUpData.session) {
        return { success: true, needsConfirmation: true };
      }

      if (signUpData.session?.user) return acceptForUser(signUpData.session.user.id);
      return { success: false, error: 'Account setup could not be completed. Request a fresh invitation and try again.' };
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      return { success: false, error: err?.message || 'Failed to accept invitation' };
    }
  }
};
