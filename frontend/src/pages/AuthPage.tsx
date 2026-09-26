import React, { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Phone, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Building, 
  CheckCircle2, 
  Zap,
  Clock,
  Check,
  MailCheck,
  Home
} from 'lucide-react';
import { NavigationTab, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup' | 'forgot';
  initialRole?: 'renter' | 'lister';
  redirectTab?: NavigationTab;
  onAuthSuccess: (tabToRedirect?: NavigationTab) => void;
  onNavigateHome: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  initialRole = 'renter',
  redirectTab,
  onAuthSuccess,
  onNavigateHome
}) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [signupRole, setSignupRole] = useState<'renter' | 'lister'>(initialRole);
  
  // Sync state if initial props change
  useEffect(() => {
    setView(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setSignupRole(initialRole);
  }, [initialRole]);

  // Sign In fields
  const [signinIdentifier, setSigninIdentifier] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPw, setShowSigninPw] = useState(false);
  const [signinRemember, setSigninRemember] = useState(true);
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinShake, setSigninShake] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signinSuccess, setSigninSuccess] = useState(false);

  // Sign Up fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupShake, setSignupShake] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotShake, setForgotShake] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const signinIdInputId = useId();
  const signinPwInputId = useId();
  const signupNameId = useId();
  const signupPhoneId = useId();
  const signupEmailId = useId();
  const signupAgencyId = useId();
  const signupPwId = useId();
  const forgotEmailId = useId();

  // Resend countdown timer effect
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Real-time email validation
  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Password strength calculation
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: 'Minimum 8 characters', color: '#E6E3EE' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels = [
      { label: 'Weak password', color: '#B42318' },
      { label: 'Fair password', color: '#B45309' },
      { label: 'Good password', color: '#CA8A04' },
      { label: 'Strong password', color: '#167A54' }
    ];
    return {
      score,
      label: levels[Math.max(score - 1, 0)].label,
      color: levels[Math.max(score - 1, 0)].color
    };
  };

  const pwStrength = getPasswordStrength(signupPassword);

  // Handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninError(null);

    if (!signinIdentifier.trim()) {
      setSigninError('Enter your email or phone number.');
      setSigninShake(true);
      setTimeout(() => setSigninShake(false), 400);
      return;
    }
    if (!signinPassword) {
      setSigninError('Enter your password.');
      setSigninShake(true);
      setTimeout(() => setSigninShake(false), 400);
      return;
    }

    setIsSigningIn(true);
    const res = await authService.login(signinIdentifier, signinPassword);

    if (res.success) {
      setSigninSuccess(true);
      setTimeout(() => {
        let target: NavigationTab = 'search';
        if (redirectTab) {
          target = redirectTab;
        } else if (res.user?.role === 'admin') {
          target = 'admin';
        } else if (res.user?.role === 'landlord' || res.user?.role === 'agent') {
          target = 'lister';
        } else {
          target = 'search';
        }
        onAuthSuccess(target);
      }, 700);
    } else {
      setIsSigningIn(false);
      setSigninError(res.error || 'Failed to sign in. Please verify your credentials.');
      setSigninShake(true);
      setTimeout(() => setSigninShake(false), 400);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (fullName.trim().length < 2) {
      setSignupError('Please enter your full name.');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
      return;
    }
    if (phone.trim().length < 7) {
      setSignupError('Enter a valid Nigerian phone number (e.g. 08012345678).');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
      return;
    }
    if (!isEmailValid(email)) {
      setSignupError('Enter a valid email address.');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError('Password must contain at least 8 characters.');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
      return;
    }
    if (!agreedToTerms) {
      setSignupError('Please accept Rentivo\'s Terms of Service to continue.');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
      return;
    }

    setIsSigningUp(true);
    const role: UserRole = signupRole === 'lister' ? (agencyName ? 'agent' : 'landlord') : 'tenant';

    const res = await authService.signup({
      fullName,
      phone,
      email,
      role,
      agencyName: agencyName.trim() || undefined,
      password: signupPassword
    });

    if (res.success) {
      setSignupSuccess(true);
      setTimeout(() => {
        if (signupRole === 'renter') {
          navigate('/onboarding/renter');
          return;
        }
        const target = redirectTab || (role === 'landlord' || role === 'agent' ? 'lister' : 'search');
        onAuthSuccess(target);
      }, 750);
    } else {
      setIsSigningUp(false);
      setSignupError(res.error || 'Account creation failed.');
      setSignupShake(true);
      setTimeout(() => setSignupShake(false), 400);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(forgotEmail)) {
      setForgotShake(true);
      setTimeout(() => setForgotShake(false), 400);
      return;
    }

    setIsSendingReset(true);
    const res = await authService.requestPasswordReset(forgotEmail);
    setIsSendingReset(false);
    if (!res.success) {
      setForgotShake(true);
      setTimeout(() => setForgotShake(false), 400);
      return;
    }
    setForgotSubmitted(true);
    setResendTimer(30);
  };

  const handleMagicLink = async () => {
    if (!isEmailValid(signinIdentifier) && !isEmailValid(email)) {
      setSigninError('Enter a valid email to receive a magic link.');
      return;
    }
    setIsSigningIn(true);
    const res = await authService.sendMagicLink(signinIdentifier || email);
    setIsSigningIn(false);
    if (!res.success) {
      setSigninError(res.error || 'Could not send magic link.');
      return;
    }
    setSigninSuccess(true);
  };

  // Dynamic visual configurations matching files/ (rentivo-signin.html, rentivo-signup.html, rentivo-forgot.html)
  const getVisualConfig = () => {
    switch (view) {
      case 'signin':
        return {
          img: 'https://ik.imagekit.io/3unwhixxd/sign%20in.png',
          imgAlt: 'Person confirming access on a phone',
          badgeClass: 'badge-right',
          badgeIcon: <Zap size={16} />,
          badgeTitle: 'Avg. 24 min response',
          badgeSub: 'from Rentivo listers',
          headline: 'Welcome back to Rentivo.',
          subtext: 'Your saved searches, access requests, and confirmed properties are right where you left them.'
        };
      case 'signup':
        return {
          img: 'https://ik.imagekit.io/3unwhixxd/sign%20uup.png',
          imgAlt: 'Person receiving keys to a new home',
          badgeClass: 'badge-left',
          badgeIcon: <ShieldCheck size={16} />,
          badgeTitle: '98 listings verified',
          badgeSub: 'this month in Ibadan',
          headline: signupRole === 'lister'
            ? 'List your Ibadan properties. Direct tenants.'
            : 'Join Rentivo. Find your next place with confidence.',
          subtext: signupRole === 'lister'
            ? 'Connect directly with verified renters with zero platform listing charges and free physical verification badges.'
            : 'Browse verified homes, shops, and offices in Ibadan. Free to sign up, free to browse — you only pay once a property is confirmed available.'
        };
      case 'forgot':
        return {
          img: 'https://ik.imagekit.io/3unwhixxd/forget%20password.png',
          imgAlt: 'Padlock resetting with a key',
          badgeClass: 'badge-left',
          badgeIcon: <Clock size={16} />,
          badgeTitle: 'Reset link in seconds',
          badgeSub: 'valid for 30 minutes',
          headline: "No worries. Let's get you back in.",
          subtext: "We'll help you reset your password in a couple of quick steps — your saved listings will be right there when you return."
        };
      default:
        return {
          img: 'https://ik.imagekit.io/3unwhixxd/sign%20in.png',
          imgAlt: 'Person confirming access on a phone',
          badgeClass: 'badge-right',
          badgeIcon: <Zap size={16} />,
          badgeTitle: 'Avg. 24 min response',
          badgeSub: 'from Rentivo listers',
          headline: 'Welcome back to Rentivo.',
          subtext: 'Your saved searches, access requests, and confirmed properties are right where you left them.'
        };
    }
  };

  const visual = getVisualConfig();

  return (
    <div className="auth-page-root">
      {/* LEFT COLUMN: HIGH-FIDELITY ART & SPOTLIGHT STAGE */}
      <div className="auth-art-side">
        {/* Ambient Glowing Floating Blobs */}
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />

        {/* Brand Logo Lockup linking to Home */}
        <div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="auth-art-logo"
            title="Return to Rentivo Home"
          >
            <img 
              src="/RENTIVO-lockup.svg" 
              alt="Rentivo" 
              style={{ height: '32px', filter: 'brightness(0) invert(1)' }} 
            />
          </a>
        </div>

        {/* Circular Spotlight Stage & Dynamic Floating Physics Badge */}
        <div className="auth-art-figure">
          <div className="auth-art-figure-inner">
            <div key={`${view}-${signupRole}`} className="auth-art-stage">
              <img src={visual.img} alt={visual.imgAlt} />
            </div>

            <div key={`badge-${view}`} className={`auth-floating-badge ${visual.badgeClass}`}>
              <div className="fb-icon">
                {visual.badgeIcon}
              </div>
              <div className="fb-text">
                <div className="t1">{visual.badgeTitle}</div>
                <div className="t2">{visual.badgeSub}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Headline, Value Props & Frosted Glass Trust Badges */}
        <div>
          <div className="auth-art-copy">
            <h1>{visual.headline}</h1>
            <p>{visual.subtext}</p>
          </div>

          <div className="auth-art-badges">
            <span>
              <ShieldCheck size={14} color="#BE89FF" />
              Verified listings
            </span>
            <span>
              <Lock size={14} color="#BE89FF" />
              Secure by design
            </span>
            {signupRole === 'lister' && view === 'signup' && (
              <span>
                <CheckCircle2 size={14} color="#BE89FF" />
                Zero listing fees
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE FORM SUITE */}
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          {/* VIEW: SIGN IN */}
          {view === 'signin' && (
            <div className="auth-fw-anim">
              <h2>Sign in</h2>
              <p className="sub">Continue your verified property search in Ibadan.</p>

              {signinError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                  {signinError}
                </div>
              )}

              <form onSubmit={handleSignIn} noValidate>
                {/* Identifier Input */}
                <div className={`auth-field ${signinIdentifier ? 'filled' : ''} ${signinShake && !signinIdentifier ? 'error shake' : ''}`}>
                  <label htmlFor={signinIdInputId} className="auth-field-label">Email or phone number</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="li" />
                    <input 
                      id={signinIdInputId}
                      type="text" 
                      value={signinIdentifier}
                      onChange={(e) => setSigninIdentifier(e.target.value)}
                      placeholder="e.g. name@example.com or 080..."
                      required 
                      autoComplete="username"
                    />
                  </div>
                  <div className="auth-field-error">Enter your email or phone number.</div>
                </div>

                {/* Password Input */}
                <div className={`auth-field ${signinPassword ? 'filled' : ''} ${signinShake && !signinPassword ? 'error shake' : ''}`}>
                  <label htmlFor={signinPwInputId} className="auth-field-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="li" />
                    <input 
                      id={signinPwInputId}
                      type={showSigninPw ? 'text' : 'password'} 
                      value={signinPassword}
                      onChange={(e) => setSigninPassword(e.target.value)}
                      placeholder="Enter your password"
                      required 
                      autoComplete="current-password"
                    />
                    <button 
                      type="button" 
                      className="auth-toggle-eye" 
                      onClick={() => setShowSigninPw(!showSigninPw)}
                      title={showSigninPw ? 'Hide password' : 'Show password'}
                    >
                      {showSigninPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="auth-field-error">Enter your password.</div>
                </div>

                <div className="auth-row-between">
                  <label className="auth-checkbox-row" style={{ marginBottom: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={signinRemember}
                      onChange={(e) => setSigninRemember(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    className="auth-link-btn"
                    onClick={() => {
                      setView('forgot');
                      setForgotSubmitted(false);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button 
                  type="submit" 
                  className={`auth-btn-primary ${signinSuccess ? 'success' : ''}`}
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <span className="spinner" />
                  ) : signinSuccess ? (
                    <>
                      <Check size={17} />
                      <span>Signed in</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-divider">or continue with</div>

              <button 
                type="button" 
                className="auth-btn-social"
                onClick={() => void handleMagicLink()}
              >
                <MailCheck size={18} />
                <span>Email me a magic link</span>
              </button>

              <p className="auth-switch-line">
                New to Rentivo?{' '}
                <button 
                  type="button" 
                  className="auth-link-btn"
                  onClick={() => setView('signup')}
                >
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* VIEW: SIGN UP */}
          {view === 'signup' && (
            <div className="auth-fw-anim">
              <h2>Create your account</h2>
              <p className="sub">Free to join. Browse anytime — pay only once a property is confirmed.</p>

              {/* Interactive Role Switcher Toggle */}
              <div className="auth-role-toggle">
                <button 
                  type="button" 
                  className={signupRole === 'renter' ? 'on' : ''}
                  onClick={() => setSignupRole('renter')}
                >
                  <Home size={15} />
                  <span>I'm a renter</span>
                </button>
                <button 
                  type="button" 
                  className={signupRole === 'lister' ? 'on' : ''}
                  onClick={() => setSignupRole('lister')}
                >
                  <Building size={15} />
                  <span>I'm a landlord / agent</span>
                </button>
              </div>

              <div className="auth-role-hint">
                <ShieldCheck size={14} style={{ color: '#000052', flexShrink: 0 }} />
                <span>
                  {signupRole === 'renter' 
                    ? 'Search, request inspections, and rent verified homes in Ibadan.' 
                    : 'List properties, manage tenants, and receive direct rental inquiries.'}
                </span>
              </div>

              {signupError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                  {signupError}
                </div>
              )}

              <form onSubmit={handleSignUp} noValidate>
                {/* Full Name Input */}
                <div className={`auth-field ${fullName ? 'filled' : ''} ${signupShake && fullName.trim().length < 2 ? 'error shake' : ''}`}>
                  <label htmlFor={signupNameId} className="auth-field-label">Full name</label>
                  <div className="auth-input-wrap">
                    <User size={16} className="li" />
                    <input 
                      id={signupNameId}
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Adeola Balogun"
                      required 
                      autoComplete="name"
                    />
                  </div>
                  <div className="auth-field-error">Please enter your full name.</div>
                </div>

                {/* Phone Input */}
                <div className={`auth-field ${phone ? 'filled' : ''} ${signupShake && phone.trim().length < 7 ? 'error shake' : ''}`}>
                  <label htmlFor={signupPhoneId} className="auth-field-label">
                    <span>Phone number</span>
                    <span className="auth-label-helper">Nigerian mobile</span>
                  </label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="li" />
                    <span className="auth-phone-prefix">+234</span>
                    <span className="auth-prefix-divider" />
                    <input 
                      id={signupPhoneId}
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="801 234 5678"
                      required 
                      autoComplete="tel"
                    />
                  </div>
                  <div className="auth-field-error">Enter a valid Nigerian phone number.</div>
                </div>

                {/* Email Input with Real-Time Spring Checkmark */}
                <div className={`auth-field ${email ? 'filled' : ''} ${signupShake && !isEmailValid(email) ? 'error shake' : ''}`}>
                  <label htmlFor={signupEmailId} className="auth-field-label">Email address</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="li" />
                    <input 
                      id={signupEmailId}
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required 
                      autoComplete="email"
                    />
                    <CheckCircle2 
                      size={16} 
                      className={`auth-status-icon ok ${isEmailValid(email) ? 'show' : ''}`} 
                    />
                  </div>
                  <div className="auth-field-error">Enter a valid email address.</div>
                </div>

                {/* Agency / Company Name (Visible if Lister) */}
                {signupRole === 'lister' && (
                  <div className={`auth-field ${agencyName ? 'filled' : ''}`} style={{ animation: 'authFieldIn 0.3s ease' }}>
                    <label htmlFor={signupAgencyId} className="auth-field-label">
                      <span>Agency or Business name</span>
                      <span className="auth-optional-chip">Optional for landlords</span>
                    </label>
                    <div className="auth-input-wrap">
                      <Building size={16} className="li" />
                      <input 
                        id={signupAgencyId}
                        type="text" 
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="e.g. Bodija Properties Ltd"
                      />
                    </div>
                    <div className="auth-field-subtext">Individual landlords letting personal property can leave this empty.</div>
                  </div>
                )}

                {/* Password Input with Dynamic Strength Meter */}
                <div className={`auth-field ${signupPassword ? 'filled' : ''} ${signupShake && signupPassword.length < 8 ? 'error shake' : ''}`}>
                  <label htmlFor={signupPwId} className="auth-field-label">
                    <span>Create a password</span>
                    <span className="auth-label-helper">Min. 8 characters</span>
                  </label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="li" />
                    <input 
                      id={signupPwId}
                      type={showSignupPw ? 'text' : 'password'} 
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Enter at least 8 characters"
                      required 
                      autoComplete="new-password"
                    />
                    <button 
                      type="button" 
                      className="auth-toggle-eye" 
                      onClick={() => setShowSignupPw(!showSignupPw)}
                      title={showSignupPw ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* 4-Segment Strength Meter */}
                  <div className="auth-strength-wrap">
                    <div className="auth-strength-track">
                      {[1, 2, 3, 4].map((seg) => (
                        <div 
                          key={seg} 
                          className="auth-strength-seg"
                          style={{
                            backgroundColor: seg <= pwStrength.score ? pwStrength.color : '#E6E3EE'
                          }}
                        />
                      ))}
                    </div>
                    <div className="auth-strength-label">
                      <span>{pwStrength.label}</span>
                      {signupPassword.length > 0 && signupPassword.length < 8 && (
                        <span style={{ color: '#B42318' }}>8+ chars required</span>
                      )}
                    </div>
                  </div>
                  <div className="auth-field-error">Password needs at least 8 characters.</div>
                </div>

                {/* Terms Agreement Checkbox */}
                <label className="auth-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <span>
                    I agree to Rentivo's <a href="/terms" className="auth-link-btn">Terms of Service</a> and <a href="/privacy" className="auth-link-btn">Privacy Policy</a>.
                  </span>
                </label>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className={`auth-btn-primary ${signupSuccess ? 'success' : ''}`}
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <span className="spinner" />
                  ) : signupSuccess ? (
                    <>
                      <Check size={17} />
                      <span>Account created</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-divider">or continue with</div>

              <button 
                type="button" 
                className="auth-btn-social"
                onClick={() => void handleMagicLink()}
              >
                <MailCheck size={18} />
                <span>Email me a magic link</span>
              </button>

              <p className="auth-switch-line">
                Already have an account?{' '}
                <button 
                  type="button" 
                  className="auth-link-btn"
                  onClick={() => setView('signin')}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <div>
              {!forgotSubmitted ? (
                <div className="auth-fw-anim">
                  <h2>Reset your password</h2>
                  <p className="sub">Enter the email tied to your account and we'll send a reset link.</p>

                  <form onSubmit={handleForgotSubmit} noValidate>
                    <div className={`auth-field ${forgotEmail ? 'filled' : ''} ${forgotShake ? 'error shake' : ''}`}>
                      <label htmlFor={forgotEmailId} className="auth-field-label">Email address</label>
                      <div className="auth-input-wrap">
                        <Mail size={16} className="li" />
                        <input 
                          id={forgotEmailId}
                          type="email" 
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="name@example.com"
                          required 
                        />
                        <CheckCircle2 
                          size={16} 
                          className={`auth-status-icon ok ${isEmailValid(forgotEmail) ? 'show' : ''}`} 
                        />
                      </div>
                      <div className="auth-field-error">Enter a valid registered email address.</div>
                    </div>

                    <button 
                      type="submit" 
                      className="auth-btn-primary"
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? (
                        <span className="spinner" />
                      ) : (
                        <>
                          <span>Send reset link</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="auth-switch-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <ArrowLeft size={14} />
                    <button 
                      type="button" 
                      className="auth-link-btn"
                      onClick={() => setView('signin')}
                    >
                      Back to sign in
                    </button>
                  </p>
                </div>
              ) : (
                /* Success Confirmation State matching files/rentivo-forgot.html */
                <div className="auth-success-box">
                  <div className="auth-success-icon">
                    <MailCheck size={32} />
                  </div>
                  <h2>Check your email</h2>
                  <p className="sub" style={{ maxWidth: '34ch', margin: '0 auto 20px' }}>
                    We've sent a password reset link to <strong>{forgotEmail}</strong>. It expires in 30 minutes — check your spam folder if it doesn't arrive shortly.
                  </p>

                  <button 
                    type="button" 
                    className="auth-btn-outline"
                    onClick={() => setView('signin')}
                    style={{ marginBottom: '14px' }}
                  >
                    Back to sign in
                  </button>

                  <div style={{ fontSize: '12.5px', color: '#636377' }}>
                    Didn't receive the email?{' '}
                    {resendTimer > 0 ? (
                      <span style={{ color: '#000052', fontWeight: 600 }}>Resend in {resendTimer}s</span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => {
                          setResendTimer(30);
                        }}
                        className="auth-link-btn"
                      >
                        Resend reset link
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
