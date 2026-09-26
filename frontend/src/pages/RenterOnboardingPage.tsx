import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ArrowRight,
  Check,
  Home,
  Building2,
  Building,
  MapPin,
  Coins,
  Zap,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  Wifi,
  Droplet,
  Car
} from 'lucide-react';
import { authService } from '../services/authService';
import { renterProfileService } from '../services/renterProfileService';
import { RenterProfile } from '../types';
import '../styles/onboarding.css';

// Illustration assets provided via ImageKit
const IMAGES = {
  goal: 'https://ik.imagekit.io/3unwhixxd/Goal.png',
  neighbourhoods: 'https://ik.imagekit.io/3unwhixxd/Neighbourhoods-removebg-preview.png',
  propertyType: 'https://ik.imagekit.io/3unwhixxd/Property%20type.png',
  budget: 'https://ik.imagekit.io/3unwhixxd/budget.png',
  timeline: 'https://ik.imagekit.io/3unwhixxd/Timeline.png',
  matching: 'https://ik.imagekit.io/3unwhixxd/Matching.png',
  reveal: 'https://ik.imagekit.io/3unwhixxd/Reveal.png'
};

const GOAL_OPTIONS = [
  { id: 'relocating', title: 'Relocating to Ibadan', sub: 'Moving into the city for the first time', icon: Home },
  { id: 'upgrading', title: 'Upgrading my space', sub: 'Looking for something bigger, newer or better', icon: Building2 },
  { id: 'work', title: 'Closer to work or business', sub: 'Cutting down on commute time and transport', icon: Building },
  { id: 'student', title: 'Student or academic life', sub: 'Near UI, Lead City, Poly or campuses', icon: Sparkles }
];

const NEIGHBORHOOD_OPTIONS = [
  { id: 'bodija', title: 'Bodija', sub: 'Central, premier & established' },
  { id: 'akobo', title: 'Akobo', sub: 'Modern residential estates' },
  { id: 'jericho', title: 'Jericho', sub: 'Exclusive, serene GRA' },
  { id: 'ringroad', title: 'Ring Road', sub: 'Commercial & lifestyle hub' },
  { id: 'uisamonda', title: 'UI / Samonda', sub: 'Academic & tech corridor' },
  { id: 'agodi', title: 'Agodi', sub: 'State Secretariat & GRA' },
  { id: 'oluyole', title: 'Oluyole', sub: 'Quiet residential estate' },
  { id: 'challenge', title: 'Challenge', sub: 'Transit & highway access' }
];

const PROPERTY_TYPE_OPTIONS = [
  { id: 'selfcontain', title: 'Self-Contain', sub: 'Compact, private & low-maintenance', icon: Home },
  { id: 'flat1', title: '1-Bedroom Flat', sub: 'Living room, ensuite room & kitchen', icon: Building2 },
  { id: 'flat2', title: '2-Bedroom Flat', sub: 'Comfortable layout with room to grow', icon: Building2 },
  { id: 'duplex', title: '3-Bed Duplex', sub: 'Multi-level home for families', icon: Building }
];

const BUDGET_OPTIONS = [
  { id: 'under600', title: 'Under ₦600,000', sub: 'Per year (Budget friendly)', min: 0, max: 600000 },
  { id: '600to1200', title: '₦600,000 – ₦1.2M', sub: 'Per year (Most popular)', min: 600000, max: 1200000 },
  { id: '1200to2500', title: '₦1.2M – ₦2.5M', sub: 'Per year (Modern gated estates)', min: 1200000, max: 2500000 },
  { id: '2500plus', title: '₦2.5M and above', sub: 'Per year (Executive & luxury)', min: 2500000, max: 15000000 }
];

const MUST_HAVE_OPTIONS = [
  { id: 'meter', title: 'Prepaid meter', sub: 'Individual, personal meter', icon: Zap },
  { id: 'borehole', title: 'Borehole water', sub: 'Reliable running water source', icon: Droplet },
  { id: 'security', title: 'Gated & guarded', sub: 'Estate or compound security', icon: ShieldCheck },
  { id: 'parking', title: 'Car parking', sub: 'Dedicated space within compound', icon: Car },
  { id: 'fibre', title: 'Fibre internet', sub: 'Ready for remote work', icon: Wifi }
];

const TIMELINE_OPTIONS = [
  { id: 'immediate', title: 'Immediately', sub: 'Ready to inspect & pay within 7 days', icon: Clock },
  { id: '2to4weeks', title: '2 to 4 weeks', sub: 'Finalizing current rent & packing', icon: Calendar },
  { id: 'nextmonth', title: 'Next month', sub: 'Planning rent transition ahead', icon: Calendar },
  { id: 'exploring', title: 'Just exploring', sub: 'Reviewing market prices first', icon: Sparkles }
];

const STATUS_STEPS = [
  'Scanning physically inspected listings in Ibadan…',
  'Matching your preferred neighbourhoods and budget…',
  'Confirming direct landlord mandates…',
  'Applying First 100 Free Access Waiver (₦5,000 value)…'
];

export const RenterOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalQuestions = 6;

  // Selected State
  const [goal, setGoal] = useState<string>('relocating');
  const [preferredAreas, setPreferredAreas] = useState<string[]>(['bodija']);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['flat1', 'flat2']);
  const [budgetTier, setBudgetTier] = useState<string>('600to1200');
  const [mustHaves, setMustHaves] = useState<string[]>(['meter', 'borehole', 'security']);
  const [timeline, setTimeline] = useState<string>('immediate');

  // Scanning radar states (Step 7)
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);

  // Reveal state (Step 8)
  const [displayCount, setDisplayCount] = useState<number>(0);

  const currentUser = authService.getCurrentUser();

  // Load existing profile if user already saved preferences or editing
  useEffect(() => {
    const loadExisting = async () => {
      let existing: RenterProfile | null = null;
      if (currentUser?.id) {
        existing = await renterProfileService.getProfile(currentUser.id);
      } else {
        existing = renterProfileService.getLocalPreferences();
      }

      if (existing) {
        if (existing.rentalGoal) setGoal(existing.rentalGoal);
        if (existing.preferredAreas?.length) setPreferredAreas(existing.preferredAreas);
        if (existing.propertyTypes?.length) setPropertyTypes(existing.propertyTypes);
        if (existing.mustHaves?.length) setMustHaves(existing.mustHaves);
        if (existing.moveInTimeline) setTimeline(existing.moveInTimeline);

        // Map budget tier back
        if (existing.budgetMax) {
          if (existing.budgetMax <= 600000) setBudgetTier('under600');
          else if (existing.budgetMax <= 1200000) setBudgetTier('600to1200');
          else if (existing.budgetMax <= 2500000) setBudgetTier('1200to2500');
          else setBudgetTier('2500plus');
        }
      }
    };
    void loadExisting();
  }, [currentUser]);

  // Live match estimate computation
  const liveMatches = useMemo(() => {
    let base = 68;
    base -= preferredAreas.length * 4;
    base -= Math.max(0, (3 - propertyTypes.length)) * 4;
    base -= mustHaves.length * 3;
    if (budgetTier === 'under600') base -= 15;
    if (budgetTier === '2500plus') base -= 6;
    if (budgetTier === '600to1200') base -= 2;
    return Math.max(12, Math.round(base));
  }, [preferredAreas, propertyTypes, mustHaves, budgetTier]);

  // Step 7 Scanning sequence
  useEffect(() => {
    if (currentStep === 7) {
      setScanStepIndex(0);
      const timer1 = setTimeout(() => setScanStepIndex(1), 700);
      const timer2 = setTimeout(() => setScanStepIndex(2), 1400);
      const timer3 = setTimeout(() => setScanStepIndex(3), 2100);
      const timer4 = setTimeout(() => {
        void saveFinalPlan();
        setCurrentStep(8);
      }, 2900);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [currentStep]);

  // Step 8 Big Count-Up animation
  useEffect(() => {
    if (currentStep === 8) {
      const target = liveMatches;
      const duration = 1000;
      const start = performance.now();

      const animate = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayCount(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [currentStep, liveMatches]);

  const saveFinalPlan = async () => {
    const selectedTier = BUDGET_OPTIONS.find(b => b.id === budgetTier) || BUDGET_OPTIONS[1];
    const profileData: Partial<RenterProfile> = {
      rentalGoal: goal,
      preferredAreas,
      propertyTypes,
      budgetMin: selectedTier.min,
      budgetMax: selectedTier.max,
      mustHaves,
      moveInTimeline: timeline,
      onboardingCompleted: true,
      onboardingSkipped: false
    };

    renterProfileService.saveLocalPreferences(profileData);
    if (currentUser?.id) {
      await renterProfileService.saveProfile(currentUser.id, profileData);
    }
  };

  const handleSkip = async () => {
    await renterProfileService.skipOnboarding(currentUser?.id);
    navigate('/account');
  };

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(-1);
    }
  };

  const toggleArea = (id: string) => {
    setPreferredAreas(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    );
  };

  const toggleType = (id: string) => {
    setPropertyTypes(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    );
  };

  const toggleMustHave = (id: string) => {
    setMustHaves(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const progressPercent = currentStep <= 6 ? Math.round((currentStep / totalQuestions) * 100) : 100;

  // Selected summaries for Step 8 reveal
  const summaryChips = useMemo(() => {
    const goalTitle = GOAL_OPTIONS.find(g => g.id === goal)?.title || 'Relocating to Ibadan';
    const areaTitles = preferredAreas.map(a => NEIGHBORHOOD_OPTIONS.find(n => n.id === a)?.title || a);
    const typeTitles = propertyTypes.map(t => PROPERTY_TYPE_OPTIONS.find(p => p.id === t)?.title || t);
    const budgetTitle = BUDGET_OPTIONS.find(b => b.id === budgetTier)?.title || '₦600k – ₦1.2M';
    const mustHaveTitles = mustHaves.map(m => MUST_HAVE_OPTIONS.find(x => x.id === m)?.title || m);
    const timelineTitle = TIMELINE_OPTIONS.find(t => t.id === timeline)?.title || 'Immediately';

    return [goalTitle, ...areaTitles, ...typeTitles, budgetTitle, ...mustHaveTitles, timelineTitle];
  }, [goal, preferredAreas, propertyTypes, budgetTier, mustHaves, timeline]);

  return (
    <div className="onboarding-page-root">
      {/* Top Minimal Navigation Bar */}
      {currentStep <= 6 && (
        <div className="onboarding-topbar">
          <div className="onboarding-topbar-row">
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={handleBack}
              aria-label="Previous step"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <div className="onboarding-progress-track">
              <div
                className="onboarding-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="onboarding-step-count">
              {currentStep} of {totalQuestions}
            </div>
            <button
              type="button"
              className="onboarding-topbar-skip"
              onClick={handleSkip}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Main Questionnaire Shell */}
      {currentStep <= 6 && (
        <div className="onboarding-shell" key={currentStep}>
          
          {/* STEP 1: Rental Goal */}
          {currentStep === 1 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <img src={IMAGES.goal} alt="Search goal" className="onboarding-illus-img" />
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 1 of 6</span>
              <h1 className="onboarding-q-title">Why are you searching in Ibadan?</h1>
              <p className="onboarding-q-sub">This helps us tailor verified listings to your situation.</p>

              <div className="onboarding-choice-list">
                {GOAL_OPTIONS.map(opt => {
                  const isSel = goal === opt.id;
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-choice-card ${isSel ? 'sel' : ''}`}
                      onClick={() => setGoal(opt.id)}
                    >
                      <span className="ic">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="txt">
                        <div className="ttl">{opt.title}</div>
                        <div className="sub2">{opt.sub}</div>
                      </span>
                      <span className="chk">
                        {isSel && <Check size={12} strokeWidth={2.5} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Neighborhoods */}
          {currentStep === 2 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <img src={IMAGES.neighbourhoods} alt="Neighbourhoods" className="onboarding-illus-img" />
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 2 of 6</span>
              <h1 className="onboarding-q-title">Which areas are you interested in?</h1>
              <p className="onboarding-q-sub">Select every neighborhood you would consider living in.</p>

              <div className="onboarding-match-banner">
                <span className="onboarding-status-dot" />
                <span className="txt"><b>{liveMatches}</b> verified homes match so far</span>
              </div>

              <div className="onboarding-pill-grid">
                {NEIGHBORHOOD_OPTIONS.map(opt => {
                  const isSel = preferredAreas.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-pill-card ${isSel ? 'sel' : ''}`}
                      onClick={() => toggleArea(opt.id)}
                    >
                      <div className="top-row">
                        <span className="ic">
                          <MapPin size={16} strokeWidth={2} />
                        </span>
                        <span className="chk">
                          {isSel && <Check size={11} strokeWidth={2.5} />}
                        </span>
                      </div>
                      <div className="ttl">{opt.title}</div>
                      <div className="sub2">{opt.sub}</div>
                    </div>
                  );
                })}
              </div>
              <div className="onboarding-sel-count">
                {preferredAreas.length} {preferredAreas.length === 1 ? 'area' : 'areas'} selected
              </div>
            </div>
          )}

          {/* STEP 3: Property Type */}
          {currentStep === 3 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <img src={IMAGES.propertyType} alt="Property type" className="onboarding-illus-img" />
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 3 of 6</span>
              <h1 className="onboarding-q-title">What type of home do you need?</h1>
              <p className="onboarding-q-sub">Choose any layouts that work for you.</p>

              <div className="onboarding-match-banner">
                <span className="onboarding-status-dot" />
                <span className="txt"><b>{liveMatches}</b> verified homes match so far</span>
              </div>

              <div className="onboarding-pill-grid">
                {PROPERTY_TYPE_OPTIONS.map(opt => {
                  const isSel = propertyTypes.includes(opt.id);
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-pill-card ${isSel ? 'sel' : ''}`}
                      onClick={() => toggleType(opt.id)}
                    >
                      <div className="top-row">
                        <span className="ic">
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <span className="chk">
                          {isSel && <Check size={11} strokeWidth={2.5} />}
                        </span>
                      </div>
                      <div className="ttl">{opt.title}</div>
                      <div className="sub2">{opt.sub}</div>
                    </div>
                  );
                })}
              </div>
              <div className="onboarding-sel-count">
                {propertyTypes.length} {propertyTypes.length === 1 ? 'type' : 'types'} selected
              </div>
            </div>
          )}

          {/* STEP 4: Budget */}
          {currentStep === 4 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <img src={IMAGES.budget} alt="Budget" className="onboarding-illus-img" />
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 4 of 6</span>
              <h1 className="onboarding-q-title">What is your annual rent budget?</h1>
              <p className="onboarding-q-sub">We only show verified listings within this price bracket.</p>

              <div className="onboarding-match-banner">
                <span className="onboarding-status-dot" />
                <span className="txt"><b>{liveMatches}</b> verified homes match so far</span>
              </div>

              <div className="onboarding-choice-list">
                {BUDGET_OPTIONS.map(opt => {
                  const isSel = budgetTier === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-choice-card ${isSel ? 'sel' : ''}`}
                      onClick={() => setBudgetTier(opt.id)}
                    >
                      <span className="ic">
                        <Coins size={18} strokeWidth={2} />
                      </span>
                      <span className="txt">
                        <div className="ttl">{opt.title}</div>
                        <div className="sub2">{opt.sub}</div>
                      </span>
                      <span className="chk">
                        {isSel && <Check size={12} strokeWidth={2.5} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Must-Haves (Clean Minimal Stage) */}
          {currentStep === 5 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <span className="onboarding-illus-shield">
                    <ShieldCheck size={38} strokeWidth={1.8} />
                  </span>
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 5 of 6</span>
              <h1 className="onboarding-q-title">Any essential amenities?</h1>
              <p className="onboarding-q-sub">Non-negotiable features for your everyday comfort.</p>

              <div className="onboarding-match-banner">
                <span className="onboarding-status-dot" />
                <span className="txt"><b>{liveMatches}</b> verified homes match so far</span>
              </div>

              <div className="onboarding-pill-grid">
                {MUST_HAVE_OPTIONS.map(opt => {
                  const isSel = mustHaves.includes(opt.id);
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-pill-card ${isSel ? 'sel' : ''}`}
                      onClick={() => toggleMustHave(opt.id)}
                    >
                      <div className="top-row">
                        <span className="ic">
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <span className="chk">
                          {isSel && <Check size={11} strokeWidth={2.5} />}
                        </span>
                      </div>
                      <div className="ttl">{opt.title}</div>
                      <div className="sub2">{opt.sub}</div>
                    </div>
                  );
                })}
              </div>
              <div className="onboarding-sel-count">
                {mustHaves.length} {mustHaves.length === 1 ? 'amenity' : 'amenities'} selected
              </div>
            </div>
          )}

          {/* STEP 6: Timeline */}
          {currentStep === 6 && (
            <div>
              <div className="onboarding-illus-wrap">
                <div className="onboarding-illus-stage">
                  <img src={IMAGES.timeline} alt="Move-in timeline" className="onboarding-illus-img" />
                </div>
              </div>

              <span className="onboarding-q-kicker">Step 6 of 6</span>
              <h1 className="onboarding-q-title">When do you plan to move in?</h1>
              <p className="onboarding-q-sub">We prioritize listings ready for key handover on your schedule.</p>

              <div className="onboarding-match-banner">
                <span className="onboarding-status-dot" />
                <span className="txt"><b>{liveMatches}</b> verified homes match so far</span>
              </div>

              <div className="onboarding-choice-list">
                {TIMELINE_OPTIONS.map(opt => {
                  const isSel = timeline === opt.id;
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.id}
                      className={`onboarding-choice-card ${isSel ? 'sel' : ''}`}
                      onClick={() => setTimeline(opt.id)}
                    >
                      <span className="ic">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="txt">
                        <div className="ttl">{opt.title}</div>
                        <div className="sub2">{opt.sub}</div>
                      </span>
                      <span className="chk">
                        {isSel && <Check size={12} strokeWidth={2.5} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Bottom Minimal Dock */}
          <div className="onboarding-sticky-cta">
            <div className="onboarding-sticky-cta-inner">
              <button
                type="button"
                className="onboarding-btn onboarding-btn-primary"
                onClick={handleNext}
              >
                <span>Continue</span>
                <ArrowRight size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="onboarding-skip-link"
                onClick={handleSkip}
              >
                Skip for now
              </button>
            </div>
          </div>

        </div>
      )}

      {/* STEP 7: Minimal Matching Loader */}
      {currentStep === 7 && (
        <div className="onboarding-match-shell">
          <div className="onboarding-clean-loader">
            <img src={IMAGES.matching} alt="Matching" />
          </div>

          <h1 className="onboarding-q-title">
            Finding your matches
          </h1>
          <p className="onboarding-q-sub">
            Filtering verified Ibadan listings based on your preferences…
          </p>

          <div className="onboarding-status-list">
            {STATUS_STEPS.map((label, idx) => {
              const isDone = scanStepIndex > idx;
              return (
                <div key={label} className={`onboarding-status-item ${isDone ? 'done' : ''}`}>
                  <span className="dot">
                    {isDone ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : (
                      <span className="onboarding-spin-mini" />
                    )}
                  </span>
                  <span className="lbl">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 8: Clean Minimal Reveal (NO SIGNUP FORM) */}
      {currentStep === 8 && (
        <div className="onboarding-reveal-shell">
          <div className="onboarding-reveal-illus">
            <div className="onboarding-reveal-stage">
              <img src={IMAGES.reveal} alt="Plan Ready" />
            </div>
          </div>

          <span className="onboarding-q-kicker">Preferences Saved</span>
          <h1 className="onboarding-q-title">
            Your search is ready
          </h1>
          <p className="onboarding-q-sub">
            We found verified properties in Ibadan matching your criteria.
          </p>

          <div className="onboarding-match-count-big">{displayCount}</div>
          <div className="onboarding-match-count-label">verified homes match your search</div>

          {/* Minimal Preference Summary Chips */}
          <div className="onboarding-chip-wrap">
            {summaryChips.map((chip, idx) => (
              <span key={idx} className="onboarding-rchip">{chip}</span>
            ))}
          </div>

          {/* Minimal Inspection Waiver Card */}
          <div className="onboarding-waiver-card">
            <span className="onboarding-waiver-ic">
              <Sparkles size={20} strokeWidth={2} />
            </span>
            <div>
              <b>₦5,000 Free Inspection Waiver Included</b>
              <span>Your first physical verification request is 100% free with direct landlord mandate.</span>
            </div>
          </div>

          {/* Clean Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="onboarding-btn onboarding-btn-primary"
              onClick={() => navigate('/search?personalized=true')}
            >
              <span>View matching listings ({displayCount})</span>
              <ArrowRight size={16} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="onboarding-btn onboarding-btn-outline"
              onClick={() => navigate('/account')}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
