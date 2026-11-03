import React, { useState } from 'react';
import {
  X,
  Mail,
  User,
  ShieldCheck,
  Shield,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { AdminRoleTier, AdminInvitation } from '../types';
import { adminService } from '../services/adminService';
import { generateAdminInvitationHtml } from '../services/emailNotificationService';

interface AdminInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: (invitation: AdminInvitation, inviteUrl?: string) => void;
  showToast: (msg: string) => void;
}

export const AdminInviteModal: React.FC<AdminInviteModalProps> = ({
  isOpen,
  onClose,
  onInviteSent,
  showToast
}) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRoleTier>('admin');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Success state for shareable link
  const [createdInvite, setCreatedInvite] = useState<{ invitation: AdminInvitation; inviteUrl: string; emailError?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    if (!createdInvite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      setCopiedLink(true);
      showToast('📋 Invitation link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Could not copy link to clipboard.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Please enter the team member\'s full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminService.createInvitation({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        notes: notes.trim() || undefined
      });

      if (!res.success || !res.invitation) {
        showToast(`Failed to invite admin: ${res.error || 'Please try again'}`);
        return;
      }

      onInviteSent(res.invitation, res.inviteUrl);

      if (res.emailError) {
        showToast(`⚠️ Invitation created! Note: ${res.emailError}`);
      } else {
        showToast(`🎉 Invitation generated & sent to ${email.trim()}!`);
      }

      if (res.inviteUrl) {
        setCreatedInvite({ invitation: res.invitation, inviteUrl: res.inviteUrl, emailError: res.emailError });
      } else {
        onClose();
      }
    } catch (err: any) {
      showToast(`Error creating invitation: ${err?.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview HTML content
  const previewHtml = generateAdminInvitationHtml({
    recipientName: fullName.trim() || 'New Team Member',
    role,
    inviteUrl: 'https://rentivos.com.ng/admin/invite?token=PREVIEW_TOKEN',
    notes: notes.trim() || undefined
  });

  return (
    <div
      className="verif-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 82, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="verif-modal-card"
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 82, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(92vh, 820px)',
          overflow: 'hidden',
          border: '1px solid #E4E1ED',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#000052',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(190, 137, 255, 0.2)',
                border: '1px solid #BE89FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#BE89FF'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
                {createdInvite ? 'Admin Invitation Ready' : 'Invite Administrator'}
              </h3>
              <div style={{ fontSize: '12.5px', color: '#DEDCF5', marginTop: '2px' }}>
                {createdInvite ? 'Share the link directly or check delivery status' : 'Authorize a new member for Rentivo operations'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#DEDCF5',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '24px',
            overscrollBehavior: 'contain'
          }}
        >
          {createdInvite ? (
            /* Success State with Copyable Link */
            <div>
              {/* Status banner — adapts based on email delivery outcome */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 16px',
                  backgroundColor: createdInvite.emailError ? '#FFFBEB' : '#ECFDF5',
                  border: `1.5px solid ${createdInvite.emailError ? '#F6D860' : '#9BD8B8'}`,
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: createdInvite.emailError ? '#D97706' : '#16794A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}
                >
                  {createdInvite.emailError ? <ExternalLink size={22} /> : <Check size={24} />}
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: createdInvite.emailError ? '#92400E' : '#16794A' }}>
                  {createdInvite.emailError ? 'Invitation Created — Email Delivery Failed' : 'Invitation Sent!'}
                </h4>
                <p style={{ margin: 0, fontSize: '13.5px', color: createdInvite.emailError ? '#78350F' : '#1B4D3E', lineHeight: 1.5 }}>
                  {createdInvite.emailError
                    ? <>
                        Email could not be sent to <strong>{createdInvite.invitation.email}</strong>. Share the link below directly via WhatsApp or copy it.
                        <br /><span style={{ fontSize: '12px', opacity: 0.8, display: 'block', marginTop: '6px' }}>Fix: Go to <strong>brevo.com → Settings → API Keys</strong> and enable the <em>Transactional Emails</em> scope.</span>
                      </>
                    : <>An authorization email has been sent to <strong>{createdInvite.invitation.email}</strong>.</>
                  }
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#000052', marginBottom: '8px' }}>
                  Direct Invitation Link (Expires in 7 days):
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FAF9FD',
                    border: '1.5px solid #E4E1ED',
                    borderRadius: '10px',
                    padding: '8px 12px'
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={createdInvite.inviteUrl}
                    style={{
                      flex: 1,
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '12.5px',
                      color: '#11112B',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: copiedLink ? '#16794A' : '#000052',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hello ${createdInvite.invitation.fullName}, you have been invited to join the Rentivo team as ${createdInvite.invitation.role}. Please click this secure link to set up your administrator account: ${createdInvite.inviteUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#F4F3F8',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  color: '#5D5D78'
                }}
              >
                <Sparkles size={16} color="#BE89FF" style={{ flexShrink: 0 }} />
                <span>
                  Invitation active for 7 days. You can copy the link or share it directly with the team member on WhatsApp, Slack, or SMS for instant setup.
                </span>
              </div>
            </div>
          ) : (
            /* Invite Form */
            <form onSubmit={handleSubmit} id="admin-invite-form">
              {/* Full Name */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Adewale"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#797996" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. samuel@rentivos.com.ng"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #E4E1ED',
                      fontSize: '14px',
                      color: '#11112B',
                      outline: 'none',
                      backgroundColor: '#FAF9FD'
                    }}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Administrative Privilege Tier <span style={{ color: '#B42318' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {/* Operations Admin */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'admin' ? '#000052' : '#E4E1ED'}`,
                      backgroundColor: role === 'admin' ? '#FAF9FD' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="adminRole"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#000052' }}>
                        Operations Admin
                      </div>
                      <div style={{ fontSize: '12px', color: '#5D5D78', marginTop: '2px', lineHeight: 1.4 }}>
                        Listing moderation, physical verification reviews, and customer escalations.
                      </div>
                    </div>
                  </label>

                  {/* Super Admin */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'super_admin' ? '#5B21B6' : '#E4E1ED'}`,
                      backgroundColor: role === 'super_admin' ? '#FBF9FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="adminRole"
                      checked={role === 'super_admin'}
                      onChange={() => setRole('super_admin')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#5B21B6' }}>
                        Super Admin
                      </div>
                      <div style={{ fontSize: '12px', color: '#5D5D78', marginTop: '2px', lineHeight: 1.4 }}>
                        Full access including team management, finance/payouts, and admin invitations.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Personal Note */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#11112B', marginBottom: '6px' }}>
                  Personal Welcome Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Welcome to the team! Looking forward to working with you on the Ibadan rollout."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #E4E1ED',
                    fontSize: '13.5px',
                    color: '#11112B',
                    outline: 'none',
                    backgroundColor: '#FAF9FD',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Email Preview Collapsible */}
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#5B21B6',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 0'
                  }}
                >
                  {showEmailPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span>{showEmailPreview ? 'Hide Dispatched Email Preview' : 'Preview Dispatched Email Template'}</span>
                </button>

                {showEmailPreview && (
                  <div
                    style={{
                      marginTop: '10px',
                      border: '1.5px solid #E2CCFF',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#F1E5FF',
                        borderBottom: '1px solid #E2CCFF',
                        fontSize: '12px',
                        color: '#4C1D95',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>To: {email.trim() || 'invitee@example.com'}</span>
                      <span>Subject: Invitation to join Rentivo Administration Team</span>
                    </div>
                    <iframe
                      srcDoc={previewHtml}
                      title="Admin Invitation Email Preview"
                      style={{
                        width: '100%',
                        height: '280px',
                        border: 'none',
                        backgroundColor: '#F2F0FA'
                      }}
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#FAF9FD',
            zIndex: 10,
            borderTop: '1px solid #E4E1ED',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: createdInvite ? 'flex-end' : 'space-between'
          }}
        >
          {createdInvite ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done &amp; Return to Team
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  color: '#5D5D78',
                  border: '1.5px solid #E4E1ED',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                form="admin-invite-form"
                disabled={isSubmitting}
                style={{
                  padding: '11px 24px',
                  borderRadius: '10px',
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 3px 10px rgba(0, 0, 82, 0.25)',
                  opacity: isSubmitting ? 0.75 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="verif-spinner" />
                    <span>Sending Invitation...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Admin Invitation</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
