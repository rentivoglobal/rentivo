import { User, AdminInvitation, AdminRoleTier } from '../types';
import { isLiveBackend, APP_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { authService } from './authService';
import { emailNotificationService } from './emailNotificationService';

function buildInviteUrl(token: string, email: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : APP_URL;
  const inviteUrl = new URL('/admin/invite', base);
  inviteUrl.searchParams.set('token', token);
  inviteUrl.searchParams.set('email', email);
  return inviteUrl.toString();
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
        throw error;
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
      throw err;
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
        throw error;
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
      throw err;
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
    const token = crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

    let emailError: string | undefined;

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

        if (error) {
          console.error('Supabase admin_invitations insert error:', error);
          return { success: false, error: `Could not save invitation: ${error.message}` };
        }
        if (!data) return { success: false, error: 'Invitation was not saved.' };
        newInvitation.id = data.id;
      } catch (err) {
        console.warn('Exception writing invitation to Supabase:', err);
        const message = err instanceof Error ? err.message : 'Unexpected database error.';
        return { success: false, error: `Could not save invitation: ${message}` };
      }
    } else {
      localStore.saveAdminInvitation(newInvitation);
    }

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

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviteUrl = buildInviteUrl(inv.token, inv.email);

    if (isLiveBackend) {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      try {
        const { data, error } = await supabase
          .from('admin_invitations')
          .update({
            expires_at: newExpiresAt,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', invitationId)
          .select('id')
          .maybeSingle();
        if (error) return { success: false, error: `Could not refresh invitation: ${error.message}` };
        if (!data) return { success: false, error: 'Invitation was not found.' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected database error.';
        return { success: false, error: `Could not refresh invitation: ${message}` };
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
      return { success: false, inviteUrl, error: `Invitation link refreshed, but the email was not sent: ${emailRes.error}` };
    }

    return { success: true, inviteUrl };
  },

  async deleteInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    if (isLiveBackend) {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      const { data, error } = await supabase
        .from('admin_invitations')
        .delete()
        .eq('id', invitationId)
        .select('id')
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'Invitation not found.' };
      return { success: true };
    }

    localStore.deleteAdminInvitation(invitationId);
    return { success: true };
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

    if (isLiveBackend) {
      if (!supabase) return { success: false, error: 'Supabase is not configured.' };
      try {
        const { data, error } = await supabase.rpc('admin_remove_user', { p_user_id: adminUserId });
        if (error) return { success: false, error: error.message };
        if (!data?.success) return { success: false, error: data?.error || 'Failed to remove administrator access.' };
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove administrator.';
        return { success: false, error: message };
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

    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_admin_invitation_by_token', { p_token: token });
        if (error) {
          console.warn('RPC get_admin_invitation_by_token error, falling back to direct query:', error);
        } else if (data) {
          if (!data.success) {
            return { valid: false, error: data.error };
          }
          return {
            valid: true,
            invitation: {
              email: data.email,
              fullName: data.full_name,
              role: data.role,
              invitedByName: data.invited_by_name,
              notes: data.notes,
              expiresAt: data.expires_at
            }
          };
        }

        // Direct select fallback
        const { data: invRow, error: selectErr } = await supabase
          .from('admin_invitations')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (selectErr || !invRow) {
          return { valid: false, error: 'Invalid or expired invitation token.' };
        }

        if (invRow.status === 'accepted') {
          return { valid: false, error: 'This invitation has already been accepted.' };
        }
        if (invRow.status === 'revoked') {
          return { valid: false, error: 'This invitation has been revoked by an administrator.' };
        }
        if (new Date(invRow.expires_at).getTime() < Date.now()) {
          return { valid: false, error: 'This invitation has expired. Please request a new invite.' };
        }

        return {
          valid: true,
          invitation: {
            email: invRow.email,
            fullName: invRow.full_name,
            role: invRow.role as AdminRoleTier,
            invitedByName: invRow.invited_by_name,
            notes: invRow.notes,
            expiresAt: invRow.expires_at
          }
        };
      } catch (err: any) {
        console.error('Error verifying token on Supabase:', err);
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
  }): Promise<{ success: boolean; error?: string }> {
    const verification = await this.verifyInvitationToken(token);
    if (!verification.valid || !verification.invitation) {
      return { success: false, error: verification.error || 'Invalid invitation.' };
    }

    const { email, fullName, role } = verification.invitation;
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

    // Live Supabase Backend
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user?.id;

      // If user is already authenticated with the matching email:
      if (userId && sessionData.session?.user?.email?.toLowerCase() === email.toLowerCase()) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('accept_admin_invitation', {
          p_token: token,
          p_user_id: userId
        });

        if (rpcErr) return { success: false, error: rpcErr.message };
        if (!rpcData?.success) return { success: false, error: rpcData?.error || 'Could not accept invitation.' };

        // Refresh session
        await authService.getSessionUser();
        return { success: true };
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
        userId = signInData.user.id;
        const { data, error } = await supabase.rpc('accept_admin_invitation', { p_token: token, p_user_id: userId });
        if (error) return { success: false, error: error.message };
        if (!data?.success) return { success: false, error: data?.error || 'Could not accept invitation.' };
        await authService.getSessionUser();
        return { success: true };
      }

      // Create new account via supabase.auth.signUp
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            full_name: finalName,
            phone,
            role: 'admin'
          }
        }
      });

      if (signUpErr) {
        // If user exists with different password:
        if (signUpErr.message.includes('already registered') || signUpErr.message.includes('already exists')) {
          return { success: false, error: 'An account with this email already exists. Please sign in first, then accept this invite.' };
        }
        return { success: false, error: signUpErr.message };
      }

      userId = signUpData.user?.id;
      if (!userId) return { success: false, error: 'Your account could not be created.' };
      if (!signUpData.session) {
        return {
          success: false,
          error: 'Confirm your email, then sign in with this address and accept the invitation again.'
        };
      }

      const { data, error } = await supabase.rpc('accept_admin_invitation', { p_token: token, p_user_id: userId });
      if (error) return { success: false, error: error.message };
      if (!data?.success) return { success: false, error: data?.error || 'Could not accept invitation.' };
      await authService.getSessionUser();

      return { success: true };
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      return { success: false, error: err?.message || 'Failed to accept invitation' };
    }
  }
};
