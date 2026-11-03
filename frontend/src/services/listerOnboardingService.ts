import { ListerOnboardingData, ListerOnboardingRole, ListerResidentialAddress, ListerUtilityBill, ListerApprovalStatus } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase, extractEdgeFunctionError } from '../lib/supabase';
import { authService } from './authService';
import { localStore } from './localStore';

const STORAGE_KEY_PREFIX = 'rentivo_v6_lister_onboarding_';
const ALL_APPLICATIONS_KEY = 'rentivo_v6_all_lister_applications';
const BREVO_API_KEY = (import.meta as any).env?.VITE_BREVO_API_KEY || '';

export interface NigerianBank {
  name: string;
  code: string;
  isPopular?: boolean;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Zenith Bank', code: '057', isPopular: true },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', isPopular: true },
  { name: 'Access Bank', code: '044', isPopular: true },
  { name: 'First Bank of Nigeria', code: '011', isPopular: true },
  { name: 'United Bank for Africa (UBA)', code: '033', isPopular: true },
  { name: 'OPay', code: '999992', isPopular: true },
  { name: 'PalmPay', code: '999991', isPopular: true },
  { name: 'Kuda Bank', code: '50211', isPopular: true },
  { name: 'Moniepoint MFB', code: '50515', isPopular: true },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'FCMB', code: '214' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Wema Bank (ALAT)', code: '035' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Taj Bank', code: '302' },
  { name: 'Keystone Bank', code: '082' }
];

export const IBADAN_AREAS_FOR_RESIDENCE = [
  'Bodija',
  'Old Bodija',
  'New Bodija',
  'Akobo',
  'Jericho',
  'Oluyole Estate',
  'Samonda',
  'UI / Agbowo Area',
  'Ring Road',
  'Challenge',
  'Agodi GRA',
  'Ikolaba',
  'Dugbe',
  'Eleyele',
  'Moniya',
  'Apata',
  'Ologuneru',
  'Alakia / Airport Road',
  'Bashorun / Idi-Ape'
];

/**
 * Normalizes a Nigerian phone number to international E.164 format without plus sign for Brevo SMS API.
 * e.g. "0803 123 4567" -> "2348031234567"
 * "+234 803 123 4567" -> "2348031234567"
 */
export interface PhoneVerificationResult {
  success: boolean;
  smsSent: boolean;
  emailSent: boolean;
  messageId?: string;
  error?: string;
  recipientFormatted?: string;
  recipientEmail?: string;
  deliveryChannel: 'sms' | 'email' | 'both' | 'none';
  statusMessage: string;
}

export function formatNigerianPhoneForSMS(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return '234' + digits.substring(1);
  }
  if (digits.length === 10) {
    return '234' + digits;
  }
  return digits;
}

export const listerOnboardingService = {
  getStorageKey(userId?: string): string {
    const id = userId || authService.getCurrentUser()?.id || 'guest_lister';
    return `${STORAGE_KEY_PREFIX}${id}`;
  },

  getOnboarding(userId?: string): ListerOnboardingData | null {
    try {
      const key = this.getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as ListerOnboardingData;
      }
    } catch (e) {
      console.warn('Failed to parse lister onboarding from storage:', e);
    }
    return null;
  },

  getDefault(userId?: string, userFullName?: string, phone?: string): ListerOnboardingData {
    const existing = this.getOnboarding(userId);
    if (existing) return existing;

    const u = authService.getCurrentUser();
    const effectiveId = userId || u?.id || 'guest_lister';
    const effectiveName = userFullName || u?.name || '';
    const effectivePhone = phone || u?.phone || '';
    const effectiveEmail = u?.email || '';

    return {
      userId: effectiveId,
      userEmail: effectiveEmail,
      userName: effectiveName,
      role: 'owner',
      phone: effectivePhone,
      whatsapp: effectivePhone,
      bankName: 'Zenith Bank',
      bankCode: '057',
      accountNumber: '',
      accountName: '',
      bankMatched: false,
      trustLevel: 1,
      residentialAddress: {
        street: '',
        landmark: '',
        area: 'Bodija',
        city: 'Ibadan',
        state: 'Oyo State'
      },
      utilityBill: {
        billType: 'ibedc_electricity',
        referenceNumber: '',
        status: 'submitted'
      },
      isFamilyProperty: false,
      completed: false,
      status: 'not_submitted'
    };
  },

  async saveOnboarding(data: Partial<ListerOnboardingData>, userId?: string): Promise<ListerOnboardingData> {
    const current = this.getDefault(userId);
    const updated: ListerOnboardingData = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Calculate trust level:
    if (updated.bankMatched && updated.residentialAddress.street && (updated.utilityBill.documentUrl || updated.utilityBill.referenceNumber)) {
      updated.trustLevel = 2;
    } else if (updated.bankMatched) {
      updated.trustLevel = 1;
    } else {
      updated.trustLevel = 1;
    }

    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save lister onboarding in localStorage:', err);
    }

    // Sync to Supabase profile if connected
    if (isLiveBackend && supabase && updated.userId && updated.userId !== 'guest_lister') {
      try {
        await supabase.from('users').update({
          phone: updated.phone || undefined,
          agency_name: updated.role === 'agent' ? (authService.getCurrentUser()?.agencyName || 'Independent Agent') : undefined
        }).eq('id', updated.userId);
      } catch (err) {
        console.warn('Failed to sync lister profile to Supabase:', err);
      }
    }

    return updated;
  },

  /**
   * Dispatches the real 6-digit confirmation code:
   * 1. Attempts Brevo SMS to the Nigerian mobile number.
   * 2. Simultaneously dispatches Brevo Transactional Email with the real OTP code to the lister's account email.
   * This guarantees that even if the Brevo account has no active prepaid SMS addons,
   * the lister receives their real code immediately without mock or sample codes.
   */
  async sendPhoneVerificationCode(
    phone: string,
    code: string,
    recipientEmail?: string
  ): Promise<PhoneVerificationResult> {
    const recipient = formatNigerianPhoneForSMS(phone);
    if (!recipient || recipient.length < 10) {
      return {
        success: false,
        smsSent: false,
        emailSent: false,
        deliveryChannel: 'none',
        error: 'Invalid Nigerian phone number format.',
        statusMessage: 'Please enter a valid Nigerian mobile phone number (e.g. 08012345678).'
      };
    }

    const effectiveEmail = (recipientEmail || authService.getCurrentUser()?.email || '').trim();

    // 1. Attempt Brevo SMS
    let smsSent = false;
    let smsError = '';
    try {
      const smsResponse = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: 'Rentivo',
          recipient,
          content: `Your Rentivo verification code is ${code}. Valid for 10 minutes. Do not disclose this code to anyone.`
        })
      });

      const smsResult = await smsResponse.json().catch(() => ({}));
      if (smsResponse.ok) {
        smsSent = true;
      } else {
        smsError = smsResult.message || `Brevo SMS status ${smsResponse.status}`;
        console.warn('Brevo SMS dispatch response:', smsError);
      }
    } catch (err: any) {
      smsError = err?.message || 'Network error sending Brevo SMS';
      console.warn('Brevo SMS dispatch network error:', err);
    }

    // 2. Dispatch Brevo Transactional Email with the real code
    let emailSent = false;
    let emailError = '';
    if (effectiveEmail) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Rentivo Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f0fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f0fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,82,0.08);">
          <tr>
            <td style="background:#000052;padding:24px 32px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
                RENT<span style="color:#be89ff;">ivo</span>
              </span>
              <span style="float:right;color:#c9c3e8;font-size:12px;font-weight:600;padding-top:6px;">IBADAN PILOT</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="font-size:20px;font-weight:700;color:#000052;margin:0 0 12px;">Confirm your phone number</h2>
              <p style="font-size:15px;color:#4b4b6e;line-height:1.55;margin:0 0 24px;">
                Use the real 6-digit confirmation code below to verify your phone number (<strong>${phone}</strong>) for your Rentivo lister account.
              </p>
              <div style="background:#f4ecff;border:2px dashed #be89ff;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#000052;">
                  ${code}
                </div>
              </div>
              <p style="font-size:13px;color:#7a7a9e;margin:0;line-height:1.5;">
                This code expires in 10 minutes. For your security, do not share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafc;border-top:1px solid #ececf2;padding:16px 32px;font-size:12px;color:#8a8aa5;text-align:center;">
              Rentivo Nigeria · Verified Lister Onboarding
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Rentivo Security', email: 'info@rentivos.com.ng' },
            to: [{ email: effectiveEmail, name: authService.getCurrentUser()?.name || 'Rentivo Lister' }],
            subject: `${code} is your Rentivo verification code`,
            htmlContent: emailHtml
          })
        });

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          const emailResJson = await emailResponse.json().catch(() => ({}));
          emailError = emailResJson.message || `Brevo Email status ${emailResponse.status}`;
          console.warn('Brevo email dispatch failed:', emailError);
        }
      } catch (err: any) {
        emailError = err?.message || 'Network error sending Brevo email';
        console.warn('Brevo email dispatch network error:', err);
      }
    }

    const success = smsSent || emailSent;
    let deliveryChannel: 'sms' | 'email' | 'both' | 'none' = 'none';
    if (smsSent && emailSent) deliveryChannel = 'both';
    else if (smsSent) deliveryChannel = 'sms';
    else if (emailSent) deliveryChannel = 'email';

    let statusMessage = '';
    if (deliveryChannel === 'both') {
      statusMessage = `Real verification code sent to both your phone (${recipient}) and email (${effectiveEmail})!`;
    } else if (deliveryChannel === 'email') {
      statusMessage = `Real verification code sent to your email (${effectiveEmail}). Please check your inbox.`;
    } else if (deliveryChannel === 'sms') {
      statusMessage = `Real verification code sent via SMS to ${recipient}!`;
    } else {
      statusMessage = smsError || emailError || 'Unable to deliver verification code. Please check your network and try again.';
    }

    return {
      success,
      smsSent,
      emailSent,
      deliveryChannel,
      recipientFormatted: recipient,
      recipientEmail: effectiveEmail,
      error: !success ? (smsError || emailError) : undefined,
      statusMessage
    };
  },

  /**
   * Compatibility wrapper for phone verification dispatch.
   */
  async sendPhoneVerificationSMS(phone: string, code: string, recipientEmail?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    isMockFallback?: boolean;
    recipientFormatted?: string;
    deliveryChannel?: 'sms' | 'email' | 'both' | 'none';
    statusMessage?: string;
    recipientEmail?: string;
  }> {
    const res = await this.sendPhoneVerificationCode(phone, code, recipientEmail);
    return {
      success: res.success,
      error: res.error,
      recipientFormatted: res.recipientFormatted,
      recipientEmail: res.recipientEmail,
      deliveryChannel: res.deliveryChannel,
      statusMessage: res.statusMessage
    };
  },

  /**
   * Resolves a 10-digit NUBAN against the bank name using Paystack's live API
   * via the Supabase Edge Function 'resolve-bank-account'.
   */
  async resolveAccountName(
    bankName: string,
    accountNumber: string,
    listerGivenName: string,
    bankCode?: string
  ): Promise<{
    accountName: string;
    matched: boolean;
    similarity: number;
    maskedAccount: string;
    bankName?: string;
    bankCode?: string;
  }> {
    const cleanAcc = accountNumber.trim();
    if (cleanAcc.length !== 10 || !/^\d{10}$/.test(cleanAcc)) {
      throw new Error('Please enter a valid 10-digit NUBAN account number.');
    }

    const effectiveCode = bankCode || NIGERIAN_BANKS.find(
      (b) => b.name.toLowerCase() === bankName.toLowerCase()
    )?.code || '057';

    // 1. Invoke Supabase Edge Function for real Paystack live resolution
    if (isLiveBackend && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-bank-account', {
          body: {
            accountNumber: cleanAcc,
            bankCode: effectiveCode,
            bankName,
            listerName: listerGivenName
          }
        });

        if (error) {
          const errMsg = await extractEdgeFunctionError(error, 'Could not verify account name with bank.');
          throw new Error(errMsg);
        }

        if (data && data.success) {
          return {
            accountName: data.accountName,
            matched: Boolean(data.matched),
            similarity: Number(data.similarity) || 0,
            maskedAccount: data.maskedAccount || (cleanAcc.slice(0, 2) + '******' + cleanAcc.slice(8)),
            bankName,
            bankCode: effectiveCode
          };
        } else if (data && data.error) {
          throw new Error(data.error);
        }
      } catch (err: any) {
        console.warn('Paystack live resolution error:', err);
        throw err;
      }
    }

    // Fallback simulation only when backend is disconnected
    await new Promise((resolve) => setTimeout(resolve, 400));
    const nameParts = listerGivenName.trim().split(/\s+/).filter(Boolean);
    let resolvedName = '';
    if (nameParts.length >= 2) {
      const surname = nameParts[nameParts.length - 1].toUpperCase();
      const first = nameParts[0].toUpperCase();
      const middleInitial = nameParts.length > 2 ? ` ${nameParts[1][0].toUpperCase()}.` : '';
      resolvedName = `${surname} ${first}${middleInitial}`;
    } else if (nameParts.length === 1) {
      resolvedName = `${nameParts[0].toUpperCase()} PROPERTIES`;
    } else {
      resolvedName = 'ACCOUNT HOLDER';
    }

    const givenTokens = listerGivenName.toLowerCase().split(/\s+/);
    const resolvedTokens = resolvedName.toLowerCase().split(/\s+/);
    const matchedTokens = givenTokens.filter((token) =>
      resolvedTokens.some((r) => r.includes(token) || token.includes(r))
    );

    const similarity = givenTokens.length > 0 ? (matchedTokens.length / givenTokens.length) * 100 : 100;
    const isMatch = similarity >= 50;
    const maskedAccount = cleanAcc.slice(0, 2) + '******' + cleanAcc.slice(8);

    return {
      accountName: resolvedName,
      matched: isMatch,
      similarity,
      maskedAccount,
      bankName,
      bankCode: effectiveCode
    };
  },

  /**
   * Completes onboarding submission: marks status as 'pending' for Admin approval.
   * Listers cannot post until approved!
   */
  async completeOnboarding(userId?: string): Promise<ListerOnboardingData> {
    const current = this.getDefault(userId);
    const sessionUser = authService.getCurrentUser();

    const completedData: ListerOnboardingData = {
      ...current,
      completed: true,
      status: 'pending', // PENDING ADMIN APPROVAL!
      submittedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      userEmail: sessionUser?.email || current.userEmail || '',
      userName: sessionUser?.name || current.userName || 'Lister',
      trustLevel: 2
    };

    // 1. Save to user's dedicated key
    const key = this.getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(completedData));

    // 2. Save / update in master application list
    this.upsertApplicationInMaster(completedData);

    // 3. Update session user with phone
    if (sessionUser) {
      const updatedUser = {
        ...sessionUser,
        phone: completedData.phone || sessionUser.phone
      };
      localStore.setSession(updatedUser);
    }

    return completedData;
  },

  /**
   * Upserts an onboarding record into the master list of all lister applications.
   */
  upsertApplicationInMaster(app: ListerOnboardingData): void {
    try {
      const all = this.getAllApplications();
      const existingIdx = all.findIndex((a) => a.userId === app.userId);
      if (existingIdx >= 0) {
        all[existingIdx] = { ...all[existingIdx], ...app, updatedAt: new Date().toISOString() };
      } else {
        all.unshift(app);
      }
      localStorage.setItem(ALL_APPLICATIONS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to upsert lister application in master list:', e);
    }
  },

  /**
   * Retrieves all lister onboarding applications for Admin review.
   */
  getAllApplications(): ListerOnboardingData[] {
    try {
      const raw = localStorage.getItem(ALL_APPLICATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as ListerOnboardingData[];
        }
      }
    } catch (e) {
      console.warn('Failed to parse all lister applications:', e);
    }

    // Default Seed Applications for testing in Admin Queue
    const defaultSeeds: ListerOnboardingData[] = [
      {
        userId: 'lister_seed_1',
        userName: 'Chief Adebayo Alabi',
        userEmail: 'adebayo.alabi@gmail.com',
        role: 'owner',
        phone: '08034567890',
        whatsapp: '08034567890',
        bankName: 'First Bank of Nigeria',
        accountNumber: '3049182910',
        accountName: 'ALABI ADEBAYO OLUWASEUN',
        bankMatched: true,
        trustLevel: 2,
        residentialAddress: {
          street: '18 Oba Akinyele Way',
          landmark: 'Bodija Market Junction',
          area: 'Bodija',
          city: 'Ibadan',
          state: 'Oyo State'
        },
        utilityBill: {
          billType: 'ibedc_electricity',
          referenceNumber: 'IBEDC-0982-1928-11',
          documentName: 'ibedc_receipt_sept.pdf',
          documentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          status: 'submitted'
        },
        isFamilyProperty: false,
        declarationAccepted: true,
        completed: true,
        status: 'pending',
        submittedAt: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        userId: 'lister_seed_2',
        userName: 'Bolanle Ojo & Co. Realtors',
        userEmail: 'bolanle@ojorealtors.ng',
        role: 'agent',
        phone: '08123456789',
        whatsapp: '08123456789',
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0129481920',
        accountName: 'OJO BOLANLE TITILAYO',
        bankMatched: true,
        trustLevel: 2,
        residentialAddress: {
          street: '42 Ring Road Commercial Hub',
          landmark: 'Opposite Mobil Station',
          area: 'Ring Road',
          city: 'Ibadan',
          state: 'Oyo State'
        },
        utilityBill: {
          billType: 'tenancy_receipt',
          referenceNumber: 'OYO-TEN-2026-904',
          documentName: 'agency_license_incorporation.pdf',
          documentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
          status: 'approved'
        },
        isFamilyProperty: false,
        declarationAccepted: true,
        completed: true,
        status: 'approved',
        submittedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
        reviewedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        reviewedBy: 'admin@rentivo.ng'
      }
    ];

    try {
      localStorage.setItem(ALL_APPLICATIONS_KEY, JSON.stringify(defaultSeeds));
    } catch {
      // Ignore
    }

    return defaultSeeds;
  },

  /**
   * Admin approves a lister onboarding application.
   * This immediately unlocks posting properties!
   */
  async approveApplication(userId: string, adminEmail: string = 'admin@rentivo.ng'): Promise<ListerOnboardingData> {
    const all = this.getAllApplications();
    const app = all.find((a) => a.userId === userId) || this.getDefault(userId);

    const updated: ListerOnboardingData = {
      ...app,
      status: 'approved',
      rejectionReason: undefined,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminEmail,
      trustLevel: 2,
      completed: true
    };

    // Update in user key
    const userKey = this.getStorageKey(userId);
    localStorage.setItem(userKey, JSON.stringify(updated));

    // Update in master list
    this.upsertApplicationInMaster(updated);

    return updated;
  },

  /**
   * Admin rejects a lister onboarding application with a detailed reason.
   */
  async rejectApplication(
    userId: string,
    reason: string,
    adminEmail: string = 'admin@rentivo.ng'
  ): Promise<ListerOnboardingData> {
    const all = this.getAllApplications();
    const app = all.find((a) => a.userId === userId) || this.getDefault(userId);

    const updated: ListerOnboardingData = {
      ...app,
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminEmail,
      completed: true
    };

    // Update in user key
    const userKey = this.getStorageKey(userId);
    localStorage.setItem(userKey, JSON.stringify(updated));

    // Update in master list
    this.upsertApplicationInMaster(updated);

    return updated;
  },

  /**
   * Check if a lister is approved to post properties.
   */
  isApproved(userId?: string): boolean {
    const ob = this.getOnboarding(userId);
    return ob?.status === 'approved';
  }
};
