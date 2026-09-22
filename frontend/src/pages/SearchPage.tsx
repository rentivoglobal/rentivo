import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ArrowRight, 
  Plus, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal, 
  ShieldCheck, 
  Sparkles, 
  Heart, 
  Star, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize2, 
  DoorClosed, 
  Building2, 
  Home, 
  Store, 
  Building, 
  Warehouse, 
  Map, 
  LayoutGrid, 
  Check, 
  X,
  Camera,
  RotateCcw,
  CheckCircle2,
  FileText,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { MarketplaceListing } from '../data/mockData';
import { FilterOptions, PropertyType, CityLocation, User } from '../types';
import { formatNaira } from '../utils/formatters';
import { locationsService } from '../services/locationsService';
import { OptimizedImage } from '../components/OptimizedImage';
import { NairaIcon } from '../components/ui';

interface SearchPageProps {
  listings: MarketplaceListing[];
  favorites: string[];
  filters: FilterOptions;
  onFilterChange: (updated: Partial<FilterOptions>) => void;
  onToggleFavorite: (id: string) => void;
  onSelectListing: (listing: MarketplaceListing) => void;
  onRequestAccess?: (listing: MarketplaceListing) => void;
  onPostListing?: () => void;
  onNavigateHome?: () => void;
  onNavigateToFavorites?: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToProfile?: () => void;
  currentUser?: User | null;
  onSignOut?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup', role?: 'renter' | 'lister') => void;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function cityOptionLabel(city: CityLocation): string {
  if (city.isPilot) return `${city.name} (Pilot)`;
  if (!city.isActive) return `${city.name} (Phase 2)`;
  return city.name;
}

function cityOptionSubtitle(city: CityLocation): string {
  if (city.isPilot) return `${city.state} · listings live now`;
  if (!city.isActive) return `${city.state} · coming soon`;
  return city.state;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  listings,
  favorites,
  filters,
  onFilterChange,
  onToggleFavorite,
  onSelectListing,
  onRequestAccess,
  onPostListing,
  onNavigateHome,
  onNavigateToFavorites,
  onNavigateToRequests,
  onNavigateToProfile,
  currentUser,
  onSignOut,
  onOpenAuth
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState<string>(filters.minPrice ? String(filters.minPrice) : '');
  const [maxPriceInput, setMaxPriceInput] = useState<string>(filters.maxPrice ? String(filters.maxPrice) : '');

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
        setIsPriceDropdownOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scale & Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const availableCities = locationsService.getCities();
  const selectedCity =
    availableCities.find((c) => c.name === (filters.city || 'Ibadan')) || availableCities[0];
  const currentCategory = filters.category || 'all';

  // Dynamic Sub-types based on PRD Category (FR-3.2)
  const categories = useMemo(() => {
    if (currentCategory === 'residential') {
      return [
        { label: 'All Residential', icon: LayoutGrid, value: 'all' },
        { label: 'Self-Contain', icon: DoorClosed, value: 'Self-Contain' },
        { label: 'Flat', icon: Building2, value: 'Flat' },
        { label: 'Duplex', icon: Home, value: 'Duplex' },
        { label: 'Bungalow', icon: Home, value: 'Bungalow' }
      ];
    }
    if (currentCategory === 'commercial') {
      return [
        { label: 'All Commercial', icon: LayoutGrid, value: 'all' },
        { label: 'Shop', icon: Store, value: 'Shop' },
        { label: 'Office', icon: Building, value: 'Office' },
        { label: 'Warehouse', icon: Warehouse, value: 'Warehouse' },
        { label: 'Land', icon: Map, value: 'Land' }
      ];
    }
    return [
      { label: 'All', icon: LayoutGrid, value: 'all' },
      { label: 'Self-Contain', icon: DoorClosed, value: 'Self-Contain' },
      { label: 'Flat', icon: Building2, value: 'Flat' },
      { label: 'Duplex', icon: Home, value: 'Duplex' },
      { label: 'Bungalow', icon: Home, value: 'Bungalow' },
      { label: 'Shop', icon: Store, value: 'Shop' },
      { label: 'Office', icon: Building, value: 'Office' },
      { label: 'Warehouse', icon: Warehouse, value: 'Warehouse' },
      { label: 'Land', icon: Map, value: 'Land' }
    ];
  }, [currentCategory]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedCat, activeChip]);

  // Compute pagination
  const totalItems = listings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedListings = listings.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 140, behavior: 'smooth' });
    }
  };

  const handleCategoryTabClick = (cat: 'all' | 'residential' | 'commercial') => {
    setSelectedCat('all');
    onFilterChange({ category: cat, type: 'All Types' });
  };

  const handleCategoryClick = (catVal: string) => {
    setSelectedCat(catVal);
    if (catVal === 'all') {
      onFilterChange({ type: 'All Types' });
    } else {
      onFilterChange({ type: catVal as PropertyType });
    }
  };

  const handleChipClick = (chipName: string) => {
    setActiveChip(chipName);
    if (chipName === 'all') {
      onFilterChange({ maxPrice: undefined, minPrice: undefined, bedrooms: undefined, verifiedOnly: false });
    } else if (chipName === 'under500k') {
      onFilterChange({ minPrice: undefined, maxPrice: 500000 });
    } else if (chipName === 'under1m') {
      onFilterChange({ minPrice: undefined, maxPrice: 1000000 });
    } else if (chipName === '1m_2m') {
      onFilterChange({ minPrice: 1000000, maxPrice: 2500000 });
    } else if (chipName === '2plus') {
      onFilterChange({ bedrooms: 2 });
    } else if (chipName === 'verified') {
      onFilterChange({ verifiedOnly: true });
    }
  };

  const handleApplyPriceRange = () => {
    const min = minPriceInput.trim() ? Number(minPriceInput) : undefined;
    const max = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
    onFilterChange({ minPrice: min, maxPrice: max });
    setIsPriceDropdownOpen(false);
  };

  const handleClearPriceRange = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    onFilterChange({ minPrice: undefined, maxPrice: undefined });
    setIsPriceDropdownOpen(false);
  };

  const handleResetAllFilters = () => {
    setSelectedCat('all');
    setActiveChip('all');
    setMinPriceInput('');
    setMaxPriceInput('');
    setIsPriceDropdownOpen(false);
    onFilterChange({
      category: 'all',
      type: 'All Types',
      area: 'All Ibadan areas',
      minPrice: undefined,
      maxPrice: undefined,
      bedrooms: undefined,
      verifiedOnly: false,
      searchQuery: '',
      sortBy: 'newest'
    });
  };

  const handleFavToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(id);
    setPoppedId(id);
    setTimeout(() => setPoppedId(null), 400);
  };

  // Active filters detection for quick-dismiss pills
  const activeFilterList: { id: string; label: string; onRemove: () => void }[] = [];
  if (filters.searchQuery && filters.searchQuery.trim()) {
    activeFilterList.push({
      id: 'query',
      label: `"${filters.searchQuery.trim()}"`,
      onRemove: () => onFilterChange({ searchQuery: '' })
    });
  }
  if (filters.category && filters.category !== 'all') {
    activeFilterList.push({
      id: 'category',
      label: filters.category === 'residential' ? 'Residential' : 'Commercial',
      onRemove: () => onFilterChange({ category: 'all' })
    });
  }
  if (filters.type && filters.type !== 'All Types') {
    activeFilterList.push({
      id: 'type',
      label: filters.type,
      onRemove: () => { setSelectedCat('all'); onFilterChange({ type: 'All Types' }); }
    });
  }
  if (filters.area && filters.area !== 'All Ibadan areas') {
    activeFilterList.push({
      id: 'area',
      label: filters.area,
      onRemove: () => onFilterChange({ area: 'All Ibadan areas' })
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    let priceLabel = '';
    if (filters.minPrice && filters.maxPrice) {
      priceLabel = `₦${(filters.minPrice / 1000).toFixed(0)}k - ₦${(filters.maxPrice / 1000).toFixed(0)}k`;
    } else if (filters.maxPrice) {
      priceLabel = `Under ₦${(filters.maxPrice / 1000).toFixed(0)}k`;
    } else if (filters.minPrice) {
      priceLabel = `From ₦${(filters.minPrice / 1000).toFixed(0)}k`;
    }
    activeFilterList.push({
      id: 'price',
      label: priceLabel,
      onRemove: handleClearPriceRange
    });
  }
  if (filters.verifiedOnly) {
    activeFilterList.push({
      id: 'verified',
      label: 'Verified Only',
      onRemove: () => onFilterChange({ verifiedOnly: false })
    });
  }
  if (filters.bedrooms) {
    activeFilterList.push({
      id: 'bedrooms',
      label: `${filters.bedrooms}+ Bedrooms`,
      onRemove: () => onFilterChange({ bedrooms: undefined })
    });
  }

  return (
    <div className="marketplace-page">
      {/* -----------------------------------------------------------------
          CLEAN TOPBAR (Logo + Saved + My Requests + Auth Profile)
          No crowded search bar in the header.
         ----------------------------------------------------------------- */}
      <header className="marketplace-topbar" id="topbar">
        <div className="marketplace-topbar-inner">
          {/* Left: Rentivo Brand Logo Lockup */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigateHome) onNavigateHome();
            }}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
            title="Return to Rentivo Home"
          >
            <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: '32px' }} />
          </a>

          {/* Right: Saved, My Requests & Profile/Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Saved Button */}
            <button
              type="button"
              onClick={() => { if (onNavigateToFavorites) onNavigateToFavorites(); }}
              style={{
                background: 'transparent',
                border: '1.5px solid #E2E8F0',
                padding: '7px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="View saved properties"
            >
              <Heart size={14} color="#000052" fill={favorites.length > 0 ? '#000052' : 'none'} />
              <span className="nav-saved-text">Saved</span>
              {favorites.length > 0 && (
                <span style={{
                  backgroundColor: '#BE89FF',
                  color: '#000052',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '1px 6px',
                  lineHeight: 1.2
                }}>
                  {favorites.length}
                </span>
              )}
            </button>

            {/* My Requests Button */}
            <button
              type="button"
              className="hide-on-mobile"
              onClick={() => { if (onNavigateToRequests) onNavigateToRequests(); }}
              style={{
                background: 'transparent',
                border: '1.5px solid #E2E8F0',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#000052',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="View your inspection and booking requests"
            >
              <FileText size={14} color="#000052" />
              <span>My Requests</span>
            </button>

            {/* Persistent List your property Doorway */}
            {onPostListing && (
              <button
                type="button"
                className="hide-on-mobile"
                onClick={onPostListing}
                style={{
                  backgroundColor: '#FAF5FF',
                  border: '1.5px solid #E9D5FF',
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#5B14B8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title="Put your property on Rentivo for free"
              >
                <Building size={14} color="#7E22CE" />
                <span>{currentUser?.role === 'landlord' || currentUser?.role === 'agent' ? 'My Properties' : 'List your property'}</span>
              </button>
            )}

            {/* Auth Buttons or User Avatar */}
            {!currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000052',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '7px 10px',
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="hide-on-mobile"
                  onClick={() => onOpenAuth && onOpenAuth('signup')}
                  style={{
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', marginLeft: '4px' }} ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  style={{
                    backgroundColor: '#F8F3FF',
                    border: '1.5px solid #E6E3EE',
                    borderRadius: '9999px',
                    padding: '4px 12px 4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#000052',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800
                  }}>
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#000052', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.name}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#7E22CE', textTransform: 'capitalize' }}>
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown size={12} color="#000052" />
                </button>

                {userDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 12px 32px rgba(0,0,82,0.12)',
                    padding: '8px',
                    minWidth: '200px',
                    zIndex: 200
                  }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#000052' }}>{currentUser.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{currentUser.email}</div>
                    </div>
                    {onNavigateToRequests && (
                      <button
                        type="button"
                        onClick={() => { onNavigateToRequests(); setUserDropdownOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '4px'
                        }}
                      >
                        <FileText size={13} color="#000052" />
                        <span>My Property Requests</span>
                      </button>
                    )}
                    {onNavigateToFavorites && (
                      <button
                        type="button"
                        onClick={() => { onNavigateToFavorites(); setUserDropdownOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Heart size={13} color="#000052" />
                        <span>Saved Properties</span>
                      </button>
                    )}
                    {onNavigateToProfile && (
                      <button
                        type="button"
                        onClick={() => { onNavigateToProfile(); setUserDropdownOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#000052',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <UserIcon size={13} color="#000052" />
                        <span>Profile & Settings</span>
                      </button>
                    )}
                    <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={() => { onSignOut(); setUserDropdownOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#DC2626',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <LogOut size={13} color="#DC2626" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* -----------------------------------------------------------------
          DEDICATED SEARCH SECTION ("A little bit down" below the header)
          Comfortable max-width contains the entire search bar without clipping.
         ----------------------------------------------------------------- */}
      <div className="marketplace-search-section">
        <div className="marketplace-search-container">
          <div className="unified-search-bar">
            {/* 1. Location Segment */}
            <div className="usb-segment usb-city" ref={cityDropdownRef}>
              <button
                type="button"
                className="usb-city-trigger"
                onClick={() => {
                  setIsCityDropdownOpen(!isCityDropdownOpen);
                  setIsTypeDropdownOpen(false);
                  setIsPriceDropdownOpen(false);
                }}
                aria-expanded={isCityDropdownOpen}
                aria-haspopup="listbox"
                title="Select city"
              >
                <MapPin size={16} color="#000052" style={{ flexShrink: 0 }} />
                <div className="usb-city-copy">
                  <span className="usb-microlabel">Location</span>
                  <span className="usb-value">
                    {selectedCity ? cityOptionLabel(selectedCity) : 'Ibadan (Pilot)'}
                  </span>
                </div>
                <ChevronDown size={14} className="usb-city-chevron" />
              </button>
              {isCityDropdownOpen && (
                <div className="custom-dropdown-panel usb-city-panel" role="listbox">
                  <div className="custom-dropdown-list">
                    {availableCities.map((city: CityLocation) => {
                      const isActive = selectedCity?.id === city.id;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          className={`custom-dropdown-item ${isActive ? 'is-active' : ''} ${!city.isActive ? 'is-disabled' : ''}`}
                          onClick={() => {
                            onFilterChange({ city: city.name, area: 'All Ibadan areas' });
                            setIsCityDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={isActive}
                        >
                          <div className="custom-dropdown-item-icon">
                            <MapPin size={15} color="var(--navy)" />
                          </div>
                          <div className="custom-dropdown-item-info">
                            <div className="custom-dropdown-item-title">{cityOptionLabel(city)}</div>
                            <div className="custom-dropdown-item-sub">{cityOptionSubtitle(city)}</div>
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

            {/* Vertical Divider */}
            <div className="usb-divider" />

            {/* 2. Keyword / Area Search Segment */}
            <div className="usb-input-wrapper">
              <Search size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span className="usb-microlabel">Area / Neighborhood</span>
                <input 
                  type="text" 
                  placeholder="e.g. Bodija, Ring Road, Akobo, Oluyole..." 
                  value={filters.searchQuery || ''}
                  onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                />
              </div>
              {filters.searchQuery && (
                <button 
                  type="button" 
                  onClick={() => onFilterChange({ searchQuery: '' })}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}
                  title="Clear search query"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="usb-divider usb-divider-extra" />

            {/* 3. Property Type Segment */}
            <div className="usb-segment usb-type-segment" ref={typeDropdownRef}>
              <button 
                type="button"
                className="usb-btn-trigger"
                onClick={() => {
                  setIsTypeDropdownOpen(!isTypeDropdownOpen);
                  setIsCityDropdownOpen(false);
                  setIsPriceDropdownOpen(false);
                }}
                title="Filter by property type"
              >
                <Building2 size={16} color="#64748B" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="usb-microlabel">Type</span>
                  <span className="usb-value">
                    {filters.type && filters.type !== 'All Types' ? filters.type : 'Any type'}
                  </span>
                </div>
                <ChevronDown size={13} color="#94A3B8" />
              </button>

              {/* Property Type Dropdown Popover */}
              {isTypeDropdownOpen && (
                <div className="usb-popover" style={{ left: 0, minWidth: '180px' }}>
                  {['All Types', 'Flat', 'Self-Contain', 'Duplex', 'Bungalow', 'Shop', 'Office', 'Warehouse'].map((t) => {
                    const isSelected = (filters.type || 'All Types') === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onFilterChange({ type: t as any });
                          setIsTypeDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                          color: isSelected ? '#000052' : '#475569',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{t}</span>
                        {isSelected && <Check size={14} color="#000052" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="usb-divider usb-divider-extra" />

            {/* 4. Budget Range Segment */}
            <div className="usb-segment usb-budget-segment" ref={priceDropdownRef}>
              <button 
                type="button"
                className="usb-btn-trigger"
                onClick={() => {
                  setIsPriceDropdownOpen(!isPriceDropdownOpen);
                  setIsCityDropdownOpen(false);
                  setIsTypeDropdownOpen(false);
                }}
                title="Filter by rental budget"
              >
                <NairaIcon size={16} color="#64748B" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="usb-microlabel">Budget</span>
                  <span className="usb-value">
                    {filters.minPrice && filters.maxPrice
                      ? `₦${(filters.minPrice / 1000).toFixed(0)}k - ₦${(filters.maxPrice / 1000).toFixed(0)}k`
                      : filters.maxPrice
                      ? `Under ₦${(filters.maxPrice / 1000).toFixed(0)}k`
                      : filters.minPrice
                      ? `From ₦${(filters.minPrice / 1000).toFixed(0)}k`
                      : 'Any budget'}
                  </span>
                </div>
                <ChevronDown size={13} color="#94A3B8" />
              </button>

              {/* Budget Popover */}
              {isPriceDropdownOpen && (
                <div className="usb-popover" style={{ right: 0, width: '300px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#000052' }}>
                      Rental Budget (₦)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPriceDropdownOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        Min (₦)
                      </label>
                      <input
                        type="number"
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                        placeholder="e.g. 250,000"
                        style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1.5px solid #CBD5E1', padding: '0 8px', fontSize: '12.5px', fontWeight: 600, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                        Max (₦)
                      </label>
                      <input
                        type="number"
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                        placeholder="e.g. 1,500,000"
                        style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1.5px solid #CBD5E1', padding: '0 8px', fontSize: '12.5px', fontWeight: 600, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleClearPriceRange}
                      style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPriceRange}
                      style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', background: '#000052', color: '#FFFFFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Search Button */}
            <button 
              type="button"
              className="usb-search-btn"
              onClick={() => {
                if (gridContainerRef.current) {
                  gridContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              title="Search Properties"
            >
              <Search size={15} color="#FFFFFF" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          MAIN MARKETPLACE BODY (Enlarged to fit the rest of the page seamlessly)
         ----------------------------------------------------------------- */}
      <div className="marketplace-body" ref={gridContainerRef}>

        {/* FR-3.2: Primary Category Segmented Tabs (All | Residential | Commercial) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 0 8px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9'
        }}>
          {[
            { id: 'all', label: 'All Properties', icon: LayoutGrid },
            { id: 'residential', label: 'Residential', icon: Home },
            { id: 'commercial', label: 'Commercial', icon: Store }
          ].map(tab => {
            const isTabActive = currentCategory === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryTabClick(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: isTabActive ? '2px solid #000052' : '1px solid #E2E8F0',
                  backgroundColor: isTabActive ? '#000052' : '#F8FAFC',
                  color: isTabActive ? '#FFFFFF' : '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <TabIcon size={14} color={isTabActive ? '#FFFFFF' : '#64748B'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Categories Row with Native Crisp SVG Icons */}
        <div className="cat-row" id="catRow">
          {categories.map((c: any) => {
            const IconComponent = c.icon;
            const isActive = selectedCat === c.value;
            return (
              <button 
                key={c.value}
                className={`cat ${isActive ? 'active' : ''}`}
                onClick={() => handleCategoryClick(c.value)}
              >
                <IconComponent size={20} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Chips & Sorting Row */}
        <div className="filter-row" style={{ position: 'relative' }}>
          <div className="chip-scroll" id="chipRow">
            <button 
              className={`chip ${activeChip === 'all' ? 'on' : ''}`}
              onClick={() => handleChipClick('all')}
            >
              All
            </button>
            <button 
              className={`chip ${activeChip === 'verified' ? 'on' : ''}`}
              onClick={() => handleChipClick('verified')}
            >
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Verified Only
            </button>
            <button 
              className={`chip ${activeChip === 'under500k' ? 'on' : ''}`}
              onClick={() => handleChipClick('under500k')}
            >
              Under ₦500,000
            </button>
            <button 
              className={`chip ${activeChip === 'under1m' ? 'on' : ''}`}
              onClick={() => handleChipClick('under1m')}
            >
              Under ₦1,000,000
            </button>
            <button 
              className={`chip ${activeChip === '1m_2m' ? 'on' : ''}`}
              onClick={() => handleChipClick('1m_2m')}
            >
              ₦1M - ₦2.5M
            </button>
            {currentCategory !== 'commercial' && (
              <button 
                className={`chip ${activeChip === '2plus' ? 'on' : ''}`}
                onClick={() => handleChipClick('2plus')}
              >
                2+ bedrooms
              </button>
            )}
          </div>

          <div className="filter-actions">
            <button 
              className="filter-btn"
              onClick={() => {
                const isV = !filters.verifiedOnly;
                onFilterChange({ verifiedOnly: isV });
              }}
              style={{
                backgroundColor: filters.verifiedOnly ? '#ECFDF5' : '#FFFFFF',
                borderColor: filters.verifiedOnly ? '#047857' : '#CBD5E1',
                color: filters.verifiedOnly ? '#047857' : '#334155'
              }}
            >
              <ShieldCheck size={14} color={filters.verifiedOnly ? '#047857' : '#64748B'} />
              <span>{filters.verifiedOnly ? 'Verified Only' : 'Filter Verified'}</span>
            </button>

            {/* Sort Select */}
            <div className="sort-select">
              <span>Sort by:</span>
              <select 
                value={filters.sortBy || 'newest'}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Row (Pills with Dismiss X and Clear All) */}
        {activeFilterList.length > 0 && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '12px 0 4px',
              fontSize: '13px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Filters:
            </span>
            {activeFilterList.map(af => (
              <span
                key={af.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#000052',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={af.onRemove}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0, display: 'flex' }}
                  title="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetAllFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '4px'
              }}
            >
              <RotateCcw size={12} />
              <span>Clear all</span>
            </button>
          </div>
        )}

        {/* Results Header / Summary */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '20px 0 16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000052', margin: 0 }}>
              {filters.searchQuery?.trim()
                ? `Properties matching "${filters.searchQuery.trim()}"`
                : `${currentCategory === 'residential' ? 'Residential Homes' : currentCategory === 'commercial' ? 'Commercial Spaces' : 'Listed Properties'} in ${filters.city || 'Ibadan'}`}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#636377', margin: '2px 0 0' }}>
              {listings.length} verified & verified-in-progress properties available
            </p>
          </div>
          {listings.length > 0 && (
            <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
              Page {validCurrentPage} of {totalPages}
            </div>
          )}
        </div>

        {/* Empty State */}
        {listings.length === 0 ? (
          <div 
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E3EE',
              margin: '24px 0'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#F0E6FF',
                color: '#000052',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Search size={28} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#000052', margin: '0 0 8px' }}>
              No Properties Match Your Search
            </h3>
            <p style={{ fontSize: '14px', color: '#636377', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              We could not find any rentals in {filters.city || 'Ibadan'} matching your current filters. Try widening your budget or clearing filters.
            </p>
            <button 
              type="button"
              onClick={handleResetAllFilters}
              style={{
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          /* 4-Column Paginated Card Grid */
          <div className="market-grid" id="grid">
            {paginatedListings.map(item => {
              const isFav = favorites.includes(item.id);
              const isPopping = poppedId === item.id;
              const photoCount = item.photos?.length || 1;

              return (
                <div 
                  key={item.id} 
                  className="market-card"
                  onClick={() => onSelectListing(item)}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Photo Container with Verified Badge & Photo Counter */}
                  <div className="market-card-img">
                    <OptimizedImage src={item.photos[0]} alt={item.title} width={500} height={280} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    {item.verificationStatus === 'verified' && !item.isNew && (
                      <span className="ribbon" style={{ backgroundColor: '#16794A', color: '#FFFFFF' }}>
                        <ShieldCheck size={13} />
                        <span>Verified</span>
                      </span>
                    )}
                    {item.isNew && (
                      <span className="ribbon new">
                        <Sparkles size={13} />
                        <span>New</span>
                      </span>
                    )}

                    {/* Multi-Photo Count Indicator */}
                    {photoCount > 1 && (
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '10px',
                          backgroundColor: 'rgba(0, 0, 82, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          zIndex: 2
                        }}
                      >
                        <Camera size={11} />
                        <span>{photoCount}</span>
                      </div>
                    )}

                    {/* Favorite Button */}
                    <button 
                      className={`fav ${isFav ? 'active' : ''} ${isPopping ? 'pop' : ''}`}
                      aria-label="Save property"
                      onClick={(e) => handleFavToggle(item.id, e)}
                    >
                      <Heart 
                        size={16} 
                        fill={isFav ? "#B42318" : "none"} 
                        color={isFav ? "#B42318" : "var(--ink)"} 
                      />
                    </button>
                  </div>

                  <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      {/* Badges */}
                      <div className="card-badges" style={{ margin: '0 0 8px' }}>
                        <span className="b b-type">{item.type}</span>
                        <span className="b b-status" style={{ backgroundColor: item.isAvailable ? '#EFF6FF' : '#FEF3C7', color: item.isAvailable ? '#1D4ED8' : '#B45309' }}>
                          {item.isAvailable ? 'Available' : 'Under Check'}
                        </span>
                      </div>

                      {/* Title & Rating */}
                      <div className="card-title-row" style={{ margin: '0 0 6px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#000052', lineHeight: 1.3 }}>{item.title}</h4>
                        {item.rating && (
                          <span className="rating">
                            <Star size={13} fill="#F5A524" color="#F5A524" />
                            <span>{item.rating.toFixed(1)}</span>
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <p className="loc" style={{ margin: '0 0 10px', fontSize: '12px', color: '#636377', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#000052" />
                        <span>{item.area}, {item.city || 'Ibadan'}</span>
                      </p>

                      {/* Specs */}
                      <div className="card-stats" style={{ margin: '0 0 12px', fontSize: '12px', color: '#636377' }}>
                        {item.category === 'commercial' ? (
                          <>
                            {item.commercialSpecs?.floorLevel && (
                              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#000052' }}>
                                {item.commercialSpecs.floorLevel}
                              </span>
                            )}
                            {(item.commercialSpecs?.usableAreaSqm || item.areaSqm) && (
                              <span>
                                <Maximize2 size={13} />
                                <span>{item.commercialSpecs?.usableAreaSqm || item.areaSqm} sqm</span>
                              </span>
                            )}
                            {item.commercialSpecs?.restroomsCount ? (
                              <span>
                                <Bath size={14} />
                                <span>{item.commercialSpecs.restroomsCount} WC</span>
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {item.bedrooms ? (
                              <span>
                                <Bed size={14} />
                                <span>{item.bedrooms} {item.bedrooms === 1 ? 'bed' : 'beds'}</span>
                              </span>
                            ) : null}
                            {item.bathrooms ? (
                              <span>
                                <Bath size={14} />
                                <span>{item.bathrooms} {item.bathrooms === 1 ? 'bath' : 'baths'}</span>
                              </span>
                            ) : null}
                            {item.areaSqm ? (
                              <span>
                                <Maximize2 size={13} />
                                <span>{item.areaSqm} sqm</span>
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div className="price-row" style={{ margin: 0 }}>
                        <span className="now" style={{ fontSize: '16px', fontWeight: 800, color: '#000052' }}>{formatNaira(item.price)}</span>
                        <span className="per" style={{ fontSize: '11.5px', color: '#636377' }}>{item.pricePeriod === 'per_sale' ? '/sale' : '/year'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestAccess?.(item);
                        }}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          background: '#000052',
                          border: 'none',
                          borderRadius: 999,
                          padding: '7px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        Request Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scalable Pagination Controls (Back button, Forward button, Page numbers, Per page) */}
        {listings.length > 0 && (
          <div 
            style={{
              marginTop: '36px',
              paddingTop: '20px',
              borderTop: '1px solid #E6E3EE',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            {/* Results Count Summary */}
            <div style={{ fontSize: '13px', color: '#636377' }}>
              Showing <strong style={{ color: '#000052' }}>{startIndex + 1}–{endIndex}</strong> of <strong style={{ color: '#000052' }}>{totalItems}</strong> listings in {filters.city || 'Ibadan'}
            </div>

            {/* Back, Page Numbers, and Forward Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* BACK / PREVIOUS BUTTON */}
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => handlePageChange(validCurrentPage - 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E6E3EE',
                  backgroundColor: validCurrentPage <= 1 ? '#F8FAFC' : '#FFFFFF',
                  color: validCurrentPage <= 1 ? '#94A3B8' : '#000052',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {/* Page Number Chips on Desktop / Tablets */}
              <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getPageNumbers(validCurrentPage, totalPages).map((p, idx) => (
                  p === '...' ? (
                    <span key={`ell-${idx}`} style={{ padding: '0 6px', color: '#94A3B8', fontSize: '13px' }}>...</span>
                  ) : (
                    <button
                      key={`p-${p}`}
                      type="button"
                      onClick={() => handlePageChange(Number(p))}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: Number(p) === validCurrentPage ? 'none' : '1.5px solid #E6E3EE',
                        backgroundColor: Number(p) === validCurrentPage ? '#000052' : '#FFFFFF',
                        color: Number(p) === validCurrentPage ? '#FFFFFF' : '#334155',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>

              {/* Compact Current Page Indicator on Mobile */}
              <span className="show-on-mobile" style={{ fontSize: '13px', fontWeight: 700, color: '#000052', padding: '0 8px' }}>
                {validCurrentPage} / {totalPages}
              </span>

              {/* FORWARD / NEXT BUTTON */}
              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => handlePageChange(validCurrentPage + 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E6E3EE',
                  backgroundColor: validCurrentPage >= totalPages ? '#F8FAFC' : '#FFFFFF',
                  color: validCurrentPage >= totalPages ? '#94A3B8' : '#000052',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Page Size Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#636377' }}>
              <span>Show per page:</span>
              {[8, 12, 24].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => { setPageSize(sz); setCurrentPage(1); }}
                  style={{
                    backgroundColor: pageSize === sz ? '#F0E6FF' : '#FFFFFF',
                    border: `1px solid ${pageSize === sz ? '#BE89FF' : '#E2E8F0'}`,
                    color: pageSize === sz ? '#000052' : '#64748B',
                    fontWeight: pageSize === sz ? 800 : 600,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
