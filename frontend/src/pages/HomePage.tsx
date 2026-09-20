import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Home,
  Building2,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  Coins,
  Phone
} from 'lucide-react';
import { Listing } from '../types';
import { formatNaira } from '../utils/formatters';

interface HomePageProps {
  listings?: Listing[];
  onNavigateToMarketplace: (areaFilter?: string) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenAuth: () => void;
}

const LOCATION_OPTIONS = [
  { value: 'All Ibadan areas', label: 'All Ibadan areas', subtitle: 'Browse everywhere across Ibadan' },
  { value: 'Bodija', label: 'Bodija', subtitle: 'Old & New Bodija, Housing Estate' },
  { value: 'Akobo', label: 'Akobo', subtitle: 'General Gas, Ojurin & Estates' },
  { value: 'Jericho', label: 'Jericho', subtitle: 'Serene upscale GRA residential' },
  { value: 'Ring Road', label: 'Ring Road', subtitle: 'Prime commercial & retail hub' },
  { value: 'Agodi', label: 'Agodi', subtitle: 'GRA, State Secretariat & Parliament' },
  { value: 'Iwo Road', label: 'Iwo Road', subtitle: 'Interchange, storage & transport links' },
  { value: 'UI area', label: 'UI area', subtitle: 'Samonda, University gate & environs' },
];

const GOAL_OPTIONS = [
  { value: 'all', label: 'Homes & commercial', subtitle: 'All residential and commercial properties', icon: Sparkles },
  { value: 'residential', label: 'Home to rent', subtitle: 'Self-contain, flat, duplex, bungalow', icon: Home },
  { value: 'commercial', label: 'Shop or office space', subtitle: 'Retail storefronts, corporate offices, warehouses', icon: Building2 },
];

const BUDGET_OPTIONS = [
  { value: 'any', label: 'Any budget', subtitle: 'All verified pricing tiers' },
  { value: '₦400K – ₦1.5M', label: '₦400K – ₦1.5M', subtitle: 'Self-contain studios & entry flats' },
  { value: '₦1.5M – ₦4M', label: '₦1.5M – ₦4M', subtitle: '2-3 bedroom flats & commercial units' },
  { value: '₦4M+', label: '₦4M+', subtitle: 'Luxury duplexes & executive spaces' },
];

export const HomePage: React.FC<HomePageProps> = ({
  listings = [],
  onNavigateToMarketplace,
  onSelectListing,
  onOpenAuth
}) => {
  const navigate = useNavigate();
  const showcase = listings.filter((l) => l.isApproved !== false).slice(0, 6);
  const [activePinId, setActivePinId] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('All Ibadan areas');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedBudget, setSelectedBudget] = useState<string>('₦400K – ₦1.5M');
  const [openDropdown, setOpenDropdown] = useState<'location' | 'goal' | 'budget' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const searchFormRef = useRef<HTMLFormElement>(null);
  const whyTrackRef = useRef<HTMLDivElement>(null);

  const activeListing = showcase.find(l => l.id === activePinId) || showcase[0];

  useEffect(() => {
    if (!activePinId && showcase[0]) setActivePinId(showcase[0].id);
  }, [showcase, activePinId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const scrollWhyTrack = (distance: number) => {
    if (whyTrackRef.current) {
      whyTrackRef.current.scrollBy({ left: distance, behavior: 'smooth' });
    }
  };

  const pinPositions = [
    { left: '16%', top: '24%' },
    { left: '78%', top: '32%' },
    { left: '84%', top: '64%' },
    { left: '20%', top: '58%' },
    { left: '50%', top: '16%' }
  ];

  const selectedGoalLabel = GOAL_OPTIONS.find(g => g.value === selectedGoal)?.label || 'Homes & commercial';
  const selectedBudgetLabel = selectedBudget;

  return (
    <div className="shell">
      {/* Top Hero Section */}
      <section className="hero">
        {/* Interactive SVG Roads Background */}
        <div className="hero-map" aria-hidden="true">
          <svg className="hero-roads" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
            <path className="road" d="M-20 210 C 180 160, 340 280, 560 230 S 900 140, 1300 190" />
            <path className="road road--wide" d="M-20 390 C 220 430, 430 340, 680 400 S 1040 470, 1300 430" />
            <path className="road" d="M-20 540 C 260 500, 480 600, 760 560 S 1080 500, 1300 560" />
            <path className="road" d="M160 -20 C 190 160, 90 340, 210 760" />
            <path className="road road--thin" d="M430 -20 C 400 200, 520 380, 470 760" />
            <path className="road" d="M820 -20 C 860 180, 760 400, 890 760" />
            <path className="road road--thin" d="M1100 -20 C 1060 200, 1160 390, 1080 760" />
            <path className="road road--thin" d="M40 120 C 280 80, 520 150, 780 90 S 1140 40, 1300 80" />
            <circle className="zone" cx="220" cy="300" r="70" />
            <circle className="zone" cx="1040" cy="420" r="90" />
            <circle className="zone" cx="640" cy="560" r="80" />
            <circle className="node" cx="210" cy="392" r="4" />
            <circle className="node" cx="470" cy="400" r="4" />
            <circle className="node" cx="890" cy="408" r="4" />
            <circle className="node" cx="680" cy="400" r="4" />
            <text x="118" y="268">Agodi</text>
            <text x="78" y="430">Akobo</text>
            <text x="70" y="590">Iwo Road</text>
            <text x="1088" y="250">Ring Road</text>
            <text x="1124" y="430">Jericho</text>
            <text x="1040" y="600">Bodija</text>
            <g className="map-flow">
              <path className="flow-line flow-a" d="M-20 210 C 180 160, 340 280, 560 230 S 900 140, 1300 190" />
              <path className="flow-line flow-b" d="M-20 390 C 220 430, 430 340, 680 400 S 1040 470, 1300 430" />
              <path className="flow-line flow-c" d="M160 -20 C 190 160, 90 340, 210 760" />
              <path className="flow-line flow-a" d="M820 -20 C 860 180, 760 400, 890 760" />
              <path className="flow-line flow-b" d="M-20 540 C 260 500, 480 600, 760 560 S 1080 500, 1300 560" />
              <path className="flow-line flow-c" d="M1100 -20 C 1060 200, 1160 390, 1080 760" />
            </g>
          </svg>
        </div>
        <div className="hero-fade"></div>

        {/* Hero Copy */}
        <div className="hero-copy">
          <span className="badge"><span className="badge-pin"></span>Now live in Ibadan</span>
          <h1>Find a verified place<br />to rent your next home</h1>

          <form
            ref={searchFormRef}
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setOpenDropdown(null);
              onNavigateToMarketplace(selectedArea);
            }}
          >
            <div className="search-lead" aria-hidden="true">
              <Search size={18} />
            </div>

            {/* Location Custom Dropdown */}
            <div className="search-field">
              <label onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}>
                Location
              </label>
              <button
                type="button"
                className="search-field-trigger"
                onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
                aria-expanded={openDropdown === 'location'}
                aria-haspopup="listbox"
              >
                <span className="search-field-value">{selectedArea}</span>
                <ChevronDown size={14} className="search-field-chevron" />
              </button>

              {openDropdown === 'location' && (
                <div className="custom-dropdown-panel" role="listbox">
                  <div className="custom-dropdown-list">
                    {LOCATION_OPTIONS.map((opt) => {
                      const isActive = selectedArea === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`custom-dropdown-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            setSelectedArea(opt.value);
                            setOpenDropdown(null);
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <div className="custom-dropdown-item-icon">
                            <MapPin size={15} color="var(--navy)" />
                          </div>
                          <div className="custom-dropdown-item-info">
                            <div className="custom-dropdown-item-title">{opt.label}</div>
                            <div className="custom-dropdown-item-sub">{opt.subtitle}</div>
                          </div>
                          {isActive && (
                            <div className="custom-dropdown-item-check">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Looking for Custom Dropdown */}
            <div className="search-field">
              <label onClick={() => setOpenDropdown(openDropdown === 'goal' ? null : 'goal')}>
                Looking for
              </label>
              <button
                type="button"
                className="search-field-trigger"
                onClick={() => setOpenDropdown(openDropdown === 'goal' ? null : 'goal')}
                aria-expanded={openDropdown === 'goal'}
                aria-haspopup="listbox"
              >
                <span className="search-field-value">{selectedGoalLabel}</span>
                <ChevronDown size={14} className="search-field-chevron" />
              </button>

              {openDropdown === 'goal' && (
                <div className="custom-dropdown-panel" role="listbox">
                  <div className="custom-dropdown-list">
                    {GOAL_OPTIONS.map((opt) => {
                      const IconComponent = opt.icon;
                      const isActive = selectedGoal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`custom-dropdown-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            setSelectedGoal(opt.value);
                            setOpenDropdown(null);
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <div className="custom-dropdown-item-icon">
                            <IconComponent size={16} color="var(--navy)" />
                          </div>
                          <div className="custom-dropdown-item-info">
                            <div className="custom-dropdown-item-title">{opt.label}</div>
                            <div className="custom-dropdown-item-sub">{opt.subtitle}</div>
                          </div>
                          {isActive && (
                            <div className="custom-dropdown-item-check">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Budget Custom Dropdown */}
            <div className="search-field">
              <label onClick={() => setOpenDropdown(openDropdown === 'budget' ? null : 'budget')}>
                Budget
              </label>
              <button
                type="button"
                className="search-field-trigger"
                onClick={() => setOpenDropdown(openDropdown === 'budget' ? null : 'budget')}
                aria-expanded={openDropdown === 'budget'}
                aria-haspopup="listbox"
              >
                <span className="search-field-value">{selectedBudgetLabel}</span>
                <ChevronDown size={14} className="search-field-chevron" />
              </button>

              {openDropdown === 'budget' && (
                <div className="custom-dropdown-panel custom-dropdown-panel--right" role="listbox">
                  <div className="custom-dropdown-list">
                    {BUDGET_OPTIONS.map((opt) => {
                      const isActive = selectedBudget === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`custom-dropdown-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            setSelectedBudget(opt.value);
                            setOpenDropdown(null);
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <div className="custom-dropdown-item-icon">
                            <Coins size={15} color="var(--navy)" />
                          </div>
                          <div className="custom-dropdown-item-info">
                            <div className="custom-dropdown-item-title">{opt.label}</div>
                            <div className="custom-dropdown-item-sub">{opt.subtitle}</div>
                          </div>
                          {isActive && (
                            <div className="custom-dropdown-item-check">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button className="search-btn" type="submit" aria-label="Search verified listings">
              <Search size={16} color="#fff" />
              <span>Search</span>
            </button>
          </form>

          {/* Property Owner Direct Doorway (P0 Audit Recommendation) */}
          <div style={{
            marginTop: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 82, 0.45)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(190, 137, 255, 0.35)',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontSize: '12.5px',
            color: '#FFFFFF'
          }}>
            <Building size={14} color="#BE89FF" />
            <span style={{ fontWeight: 600 }}>Own property in Ibadan?</span>
            <button
              type="button"
              onClick={() => navigate('/list-property')}
              style={{
                background: 'none',
                border: 'none',
                color: '#BE89FF',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>List your property for free</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Hero Scene with Live Featured Card & Connectors */}
        <div className="hero-scene">
          <svg className="map-connectors" id="map-connectors" aria-hidden="true">
            <path className="connector-line" id="connector-line" d="M 120 200 C 260 100, 480 80, 640 180" />
          </svg>

          {/* Authentic Map Photo Pins */}
          <div className="hero-pins" id="hero-pins">
            {showcase.slice(0, 5).map((item, idx) => {
              const pos = pinPositions[idx] || pinPositions[0];
              const isActive = activePinId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`photo-pin ${isActive ? 'is-active' : ''} ${item.verificationStatus === 'verified' ? 'is-verified' : ''}`}
                  style={{
                    left: pos.left,
                    top: pos.top
                  }}
                  onClick={() => setActivePinId(item.id)}
                  aria-label={item.title}
                >
                  <span className="pin-tip" aria-hidden="true"></span>
                  <span className="pin-head">
                    <img src={item.photos[0]} alt="" />
                  </span>
                  {item.verificationStatus === 'verified' && (
                    <span className="pin-check" aria-hidden="true"></span>
                  )}
                </button>
              );
            })}
          </div>

          {activeListing && (
          <div className="listing-stage">
            <div
              className="listing-card"
              id="featured-card"
              onClick={() => onSelectListing(activeListing)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="photo"
                style={{
                  backgroundImage: `url('${activeListing.photos[0]}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '200px'
                }}
              >
                <span className="verified-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={11} color="var(--navy)" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="body">
                <div className="title" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)', marginBottom: '5px' }}>
                  {activeListing.title}
                </div>
                <div className="loc" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted)', marginBottom: '9px' }}>
                  <MapPin size={12} color="var(--lilac)" />
                  <span>{activeListing.area}, Ibadan</span>
                </div>
                <div className="specs" style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {activeListing.bedrooms ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                      <Bed size={13} />
                      <span>{activeListing.bedrooms} bed</span>
                    </span>
                  ) : null}
                  {activeListing.bathrooms ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                      <Bath size={13} />
                      <span>{activeListing.bathrooms} bath</span>
                    </span>
                  ) : null}
                  {activeListing.areaSqm ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                      <Maximize2 size={12} />
                      <span>{activeListing.areaSqm} sqm</span>
                    </span>
                  ) : null}
                </div>
                <div className="foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="price" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--navy)' }}>
                    {formatNaira(activeListing.price)}
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500, marginLeft: '4px' }}>Per year</span>
                  </div>
                  <span className="view-btn">View details</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Page Content Container */}
      <div className="page">
        {/* Stats Strip */}
        <div className="stats">
          <p className="stats-line">
            Free to browse · Dated checks on verified homes · Flat access fee after confirm · You choose the next step
          </p>
        </div>

        {/* Value Proposition Section */}
        <section className="value" id="choose">
          <div className="value-copy reveal reveal-left is-in">
            <span className="eyebrow">— Reason to choose us</span>
            <h2>See the evidence behind every listing</h2>
            <p>We handle the heavy lifting by checking properties in person, showing what was verified and when, and letting you browse before you share a phone number.</p>
            <button className="btn-pill" onClick={() => onNavigateToMarketplace()}>
              Browse listings <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
            </button>
          </div>
          <div className="value-grid reveal reveal-right is-in">
            <article className="value-card">
              <div className="value-searchbar" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={15} color="var(--muted)" />
                <span>Search listings</span>
              </div>
              <h3>Browse without an account</h3>
              <p>Filter Ibadan homes and shops, then inspect the evidence before you sign up.</p>
            </article>
            <article className="value-card">
              <div className="trust-mark" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={28} color="#000052" />
              </div>
              <h3>Dated verification</h3>
              <p>Each Verified badge shows what was checked and the date it was done.</p>
            </article>
            <article className="value-card value-card--wide">
              <div className="value-wide-copy">
                <div className="value-pin" aria-hidden="true">
                  <span className="value-bubble">Flat fee</span>
                  <span className="value-pin-mark"><i></i></span>
                </div>
                <svg className="value-dash" viewBox="0 0 180 70" fill="none" aria-hidden="true">
                  <path d="M8 58 C 70 8, 120 8, 172 28" stroke="#BE89FF" strokeWidth="1.8" strokeDasharray="5 6" strokeLinecap="round" />
                </svg>
                <h3>Pay only after confirmation</h3>
                <p>The access fee is requested only when the lister confirms the property is still available.</p>
              </div>
              <div className="value-wide-media">
                <img className="stack-mid" src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=360&q=80" alt="" />
                <img className="stack-back" src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=360&q=80" alt="" />
                <img className="stack-front" src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=520&q=80" alt="Verified duplex in Bodija" />
              </div>
            </article>
          </div>
        </section>

        {/* Goal Selector Section */}
        <section className="goals" id="goals">
          <div className="sec-head reveal is-in">
            <span className="eyebrow">Start with your goal</span>
            <h2>What are you looking for?</h2>
            <p>Choose the path that fits your search. You can change it later, or browse everything now.</p>
          </div>
          <div className="goal-grid">
            <div className="goal-card is-in" onClick={() => onNavigateToMarketplace()} style={{ cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80" alt="Rent a home in Ibadan" />
              <span className="goal-pill">Residential</span>
              <h3>A home to rent</h3>
              <p>Self-contain, flat, duplex, or bungalow across Ibadan.</p>
              <span className="goal-go goal-go--light">Browse homes <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} /></span>
            </div>
            <div className="goal-card is-in" onClick={() => onNavigateToMarketplace()} style={{ cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80" alt="Shop or office space" />
              <span className="goal-pill">Commercial</span>
              <h3>A shop or office</h3>
              <p>Commercial space for a business, with the same check dates shown.</p>
              <span className="goal-go goal-go--light">Browse commercial <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} /></span>
            </div>
            <div className="goal-card goal-card--soft is-in" onClick={() => onNavigateToMarketplace()} style={{ cursor: 'pointer' }}>
              <div className="goal-copy">
                <span className="goal-pill goal-pill--soft">All Properties</span>
                <h3>I am not sure yet</h3>
                <p>Browse all available Ibadan options and filter as you go.</p>
                <span className="goal-go">Browse everything <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} /></span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Verified Listings Preview — Full Page Width */}
      <div className="page page--wide">
        <section className="listings" id="listings">
          <div className="init-head reveal is-in">
            <div>
              <span className="eyebrow">See real options first</span>
              <h2>Browse before you create an account.</h2>
            </div>
            <p>Filter by area, price, type, and availability. Open any listing to inspect the evidence.</p>
          </div>
          <div className="listing-grid">
            {showcase.slice(0, 4).map(listing => (
              <article
                key={listing.id}
                className="home-card reveal is-in"
                onClick={() => onSelectListing(listing)}
                style={{ cursor: 'pointer' }}
              >
                <div className="photo" style={{ backgroundImage: `url('${listing.photos[0]}')` }}>
                  <div className="tags">
                    <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} color="var(--navy)" /> Verified
                    </span>
                  </div>
                </div>
                <div className="body">
                  <div className="home-card-header">
                    <span className="home-card-type">{listing.type}</span>
                  </div>
                  <h3 title={listing.title}>{listing.title}</h3>
                  <div className="meta">
                    <MapPin size={12} color="var(--lilac)" />
                    <span>{listing.area}, Ibadan</span>
                  </div>
                  <div className="home-card-specs">
                    {listing.bedrooms ? (
                      <span className="home-card-spec-item">
                        <Bed size={13} /> {listing.bedrooms} bed
                      </span>
                    ) : null}
                    {listing.bathrooms ? (
                      <span className="home-card-spec-item">
                        <Bath size={13} /> {listing.bathrooms} bath
                      </span>
                    ) : null}
                    {listing.areaSqm ? (
                      <span className="home-card-spec-item">
                        <Maximize2 size={13} /> {listing.areaSqm} sqm
                      </span>
                    ) : null}
                  </div>
                  <div className="row">
                    <div className="price">{formatNaira(listing.price)}<span>Per year</span></div>
                    <button
                      className="view-btn"
                      onClick={(e) => { e.stopPropagation(); onSelectListing(listing); }}
                    >
                      View details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="page">

        {/* Why Rentivo Section */}
        <section className="why">
          <div className="why-top reveal is-in">
            <div>
              <span className="eyebrow">Why Rentivo</span>
              <h2>Built around trust,<br />not guesswork.</h2>
            </div>
            <div className="why-nav">
              <button
                className="nav-arrow"
                onClick={() => scrollWhyTrack(-320)}
                aria-label="Previous card"
              >
                <ChevronLeft size={18} color="#000052" />
              </button>
              <button
                className="nav-arrow nav-arrow--active"
                onClick={() => scrollWhyTrack(320)}
                aria-label="Next card"
              >
                <ChevronRight size={18} color="#fff" />
              </button>
            </div>
          </div>

          <div className="why-track" ref={whyTrackRef}>
            <article className="why-card why-card--muted">
              <div className="why-card-top">
                <div className="trust-mark" aria-hidden="true">
                  <ShieldCheck size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <span className="chip">Verified</span>
              </div>
              <h3>Verified<br />listings</h3>
              <p>Every verified home shows the checks completed and the date they were done.</p>
              <div className="why-card-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=500&q=80')" }}>
                <span className="read-more" onClick={() => onNavigateToMarketplace()}>
                  Browse verified <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
                </span>
              </div>
            </article>

            <article className="why-card why-card--muted">
              <div className="why-card-top">
                <div className="trust-mark" aria-hidden="true">
                  <Coins size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <span className="chip">After confirm</span>
              </div>
              <h3>Flat access<br />fee</h3>
              <p>One clear price, requested only after availability is confirmed. No surprise charges.</p>
              <div className="why-card-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=500&q=80')" }}>
                <span className="read-more" onClick={() => onNavigateToMarketplace()}>
                  Learn more <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
                </span>
              </div>
            </article>

            <article className="why-card why-card--muted">
              <div className="why-card-top">
                <div className="trust-mark" aria-hidden="true">
                  <Phone size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <span className="chip">Direct</span>
              </div>
              <h3>Real lister<br />access</h3>
              <p>Reach a named lister or agency — never a silent handoff to an unauthorized agent.</p>
              <div className="why-card-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=500&q=80')" }}>
                <span className="read-more" onClick={() => onNavigateToMarketplace()}>
                  View listings <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
                </span>
              </div>
            </article>

            <article className="why-card why-card--muted">
              <div className="why-card-top">
                <div className="trust-mark" aria-hidden="true">
                  <Search size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <span className="chip">No account</span>
              </div>
              <h3>Browse<br />freely</h3>
              <p>Explore every listing before you ever create an account or share a phone number.</p>
              <div className="why-card-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=500&q=80')" }}>
                <span className="read-more" onClick={() => onNavigateToMarketplace()}>
                  Browse listings <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>

      {/* Dedicated Property Owners Section (P0 & P2 Audit Requirement) */}
      <section style={{ backgroundColor: '#F8F3FF', borderTop: '1px solid #E9D5FF', borderBottom: '1px solid #E9D5FF', padding: '64px 20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '32px'
          }}>
            <div style={{ maxWidth: '540px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EDE5FC',
                color: '#5B14B8',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '12px'
              }}>
                <Building size={13} color="#5B14B8" />
                <span>For property owners in Ibadan</span>
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: '#000052', margin: '0 0 12px', lineHeight: 1.2 }}>
                Put your property on Rentivo
              </h2>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
                Show your home or shop to genuine seekers in Ibadan. 100% free listing, zero agent cuts from your rent, and direct inquiries to your phone.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16794A" /> 100% Free listing
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16794A" /> Zero agent commissions
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16794A" /> In-person verification
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/list-property')}
                style={{
                  backgroundColor: '#000052',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 82, 0.15)'
                }}
              >
                <span>List your property now</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* 3 Step Visual Card */}
            <div style={{
              flex: 1,
              minWidth: '280px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,82,0.06)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', margin: '0 0 16px' }}>
                How it works for owners
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EDE5FC', color: '#5B14B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>Tell us about the property</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>Area in Ibadan, number of bedrooms, and yearly rent.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EDE5FC', color: '#5B14B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>Add clear pictures</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>Snap compound, rooms, and kitchen with your phone.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>3</div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#000052' }}>Send for free review</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>We verify your property and seekers contact you directly.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recover / Support Section */}
      <section className="recover" id="recover">
        <div className="page">
          <div className="recover-simple reveal is-in">
            <span className="eyebrow">If something changes</span>
            <h2>Not the right fit? You still have options.</h2>
            <p>Hide a listing, report something inaccurate, or get support if a lister does not respond — before you pay, and after you look.</p>
            <div className="recover-actions" role="group" aria-label="Recovery actions">
              <button className="recover-action" onClick={() => setNotice('Listing feedback logged.')}>Report</button>
              <button className="recover-action" onClick={() => setNotice('Listing hidden from view.')}>Hide</button>
              <button className="recover-action recover-action--solid" onClick={() => onNavigateToMarketplace()}>
                Get support <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '4px' }} />
              </button>
              <button className="btn-pill" onClick={() => onNavigateToMarketplace()}>Browse listings</button>
            </div>
          </div>
        </div>
      </section>
      {notice && (
        <div className="toast-container">
          <div className="toast">
            <span>{notice}</span>
          </div>
        </div>
      )}
    </div>
  );
};
