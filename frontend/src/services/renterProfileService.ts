import { Listing, RenterProfile } from '../types';
import { supabase } from '../lib/supabase';
import { isLiveBackend } from '../lib/config';

const STORAGE_KEY = 'rentivo_renter_preferences';

function mapRowToProfile(row: {
  id?: string;
  user_id?: string;
  rental_goal?: string;
  preferred_areas?: string[];
  property_types?: string[];
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number | null;
  move_in_timeline?: string;
  must_haves?: string[];
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  created_at?: string;
  updated_at?: string;
}): RenterProfile {
  return {
    id: row.id,
    userId: row.user_id,
    rentalGoal: row.rental_goal || 'relocating',
    preferredAreas: row.preferred_areas || [],
    propertyTypes: row.property_types || [],
    budgetMin: Number(row.budget_min) || 0,
    budgetMax: Number(row.budget_max) || 0,
    bedrooms: row.bedrooms ?? null,
    moveInTimeline: row.move_in_timeline || 'immediate',
    mustHaves: row.must_haves || [],
    onboardingCompleted: row.onboarding_completed ?? false,
    onboardingSkipped: row.onboarding_skipped ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const renterProfileService = {
  getLocalPreferences(): RenterProfile | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveLocalPreferences(profile: Partial<RenterProfile>): void {
    try {
      const existing = this.getLocalPreferences() || {
        rentalGoal: 'relocating',
        preferredAreas: [],
        propertyTypes: [],
        budgetMin: 0,
        budgetMax: 0,
        bedrooms: null,
        moveInTimeline: 'immediate',
        mustHaves: [],
        onboardingCompleted: true
      };
      const merged = { ...existing, ...profile };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save renter preferences locally:', e);
    }
  },

  clearLocalPreferences(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear renter preferences:', e);
    }
  },

  async getProfile(userId: string): Promise<RenterProfile | null> {
    if (!isLiveBackend || !supabase) {
      return this.getLocalPreferences();
    }

    try {
      const { data, error } = await supabase
        .from('renter_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching renter profile:', error.message);
        return this.getLocalPreferences();
      }

      if (!data) {
        return this.getLocalPreferences();
      }

      const profile = mapRowToProfile(data);
      // Keep local copy synced
      this.saveLocalPreferences(profile);
      return profile;
    } catch (err) {
      console.error('Failed to get renter profile:', err);
      return this.getLocalPreferences();
    }
  },

  async saveProfile(userId: string, profile: Partial<RenterProfile>): Promise<{ success: boolean; profile?: RenterProfile; error?: string }> {
    // Always persist to local cache first
    this.saveLocalPreferences(profile);

    if (!isLiveBackend || !supabase) {
      return { success: true, profile: this.getLocalPreferences() || undefined };
    }

    try {
      const payload = {
        user_id: userId,
        rental_goal: profile.rentalGoal,
        preferred_areas: profile.preferredAreas,
        property_types: profile.propertyTypes,
        budget_min: profile.budgetMin ?? 0,
        budget_max: profile.budgetMax ?? 0,
        bedrooms: profile.bedrooms ?? null,
        move_in_timeline: profile.moveInTimeline,
        must_haves: profile.mustHaves ?? [],
        onboarding_completed: profile.onboardingCompleted ?? true,
        onboarding_skipped: profile.onboardingSkipped ?? false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('renter_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase renter_profiles upsert error:', error);
        return { success: false, error: error.message };
      }

      const saved = mapRowToProfile(data);
      return { success: true, profile: saved };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving profile';
      console.error('Renter profile save failed:', msg);
      return { success: false, error: msg };
    }
  },

  async skipOnboarding(userId?: string): Promise<void> {
    const key = `rentivo_onboarding_skipped_${userId || 'guest'}`;
    try {
      localStorage.setItem(key, 'true');
      sessionStorage.setItem(key, 'true');
    } catch {}

    if (userId && isLiveBackend && supabase) {
      try {
        await supabase
          .from('renter_profiles')
          .upsert({
            user_id: userId,
            onboarding_skipped: true,
            onboarding_completed: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Error saving skipped onboarding:', err);
      }
    }
  },

  hasCompletedOrSkipped(userId?: string, profile?: RenterProfile | null): boolean {
    if (profile?.onboardingCompleted) return true;
    if (profile?.onboardingSkipped) return true;
    const key = `rentivo_onboarding_skipped_${userId || 'guest'}`;
    const skippedLocal = localStorage.getItem(key) === 'true' || sessionStorage.getItem(key) === 'true';
    if (skippedLocal) return true;
    const completedLocal = localStorage.getItem(`rentivo_onboarding_completed_${userId || 'guest'}`) === 'true';
    return completedLocal;
  },

  async syncGuestProfile(userId: string): Promise<RenterProfile | null> {
    const local = this.getLocalPreferences();
    if (!local) return null;

    const res = await this.saveProfile(userId, local);
    if (res.success && res.profile) {
      return res.profile;
    }
    return local;
  },

  calculateMatchScore(listing: Listing, profile: RenterProfile): number {
    let score = 50; // base score for verified homes in Ibadan

    // Area Match (Up to 25 points)
    if (profile.preferredAreas && profile.preferredAreas.length > 0) {
      const matchArea = profile.preferredAreas.some(areaId =>
        isAreaMatch(areaId, listing.area || listing.addressDescription)
      );
      if (matchArea) score += 25;
    } else {
      score += 15;
    }

    // Property Type Match (Up to 20 points)
    if (profile.propertyTypes && profile.propertyTypes.length > 0) {
      const matchType = profile.propertyTypes.some(typeId =>
        isTypeMatch(typeId, listing.type, listing.bedrooms, listing.title)
      );
      if (matchType) score += 20;
    } else {
      score += 10;
    }

    // Budget Match (Up to 25 points)
    if (profile.budgetMax > 0) {
      if (listing.price <= profile.budgetMax) {
        if (profile.budgetMin > 0 && listing.price < profile.budgetMin * 0.7) {
          score += 15; // slightly below minimum expected
        } else {
          score += 25; // perfectly in target budget
        }
      } else if (listing.price <= profile.budgetMax * 1.2) {
        score += 12; // within 20% stretch budget
      }
    } else {
      score += 15;
    }

    // Bedrooms Match (Up to 10 points)
    if (profile.bedrooms && listing.bedrooms) {
      if (listing.bedrooms === profile.bedrooms) {
        score += 10;
      } else if (Math.abs(listing.bedrooms - profile.bedrooms) === 1) {
        score += 5;
      }
    }

    // Must Haves Match (Up to 15 points)
    if (profile.mustHaves && profile.mustHaves.length > 0 && listing.amenities?.length) {
      let matchedCount = 0;
      for (const mustHave of profile.mustHaves) {
        if (isAmenityMatch(mustHave, listing.amenities)) {
          matchedCount++;
        }
      }
      const amenityBonus = Math.min(15, Math.round((matchedCount / profile.mustHaves.length) * 15));
      score += amenityBonus;
    }

    return Math.min(99, Math.max(65, score));
  },

  filterMatchingListings(
    listings: Listing[],
    profile: {
      preferredAreas?: string[];
      propertyTypes?: string[];
      budgetMin?: number;
      budgetMax?: number;
      mustHaves?: string[];
    }
  ): {
    exactMatches: Listing[];
    closeMatches: Listing[];
    totalCount: number;
    topPicks: Listing[];
  } {
    if (!listings || listings.length === 0) {
      return { exactMatches: [], closeMatches: [], totalCount: 0, topPicks: [] };
    }

    const {
      preferredAreas = [],
      propertyTypes = [],
      budgetMin = 0,
      budgetMax = 0,
      mustHaves = []
    } = profile;

    const scored = listings.map(l => {
      let matchCount = 0;
      let totalCriteria = 0;

      // 1. Area
      let areaMatched = true;
      if (preferredAreas.length > 0) {
        totalCriteria++;
        areaMatched = preferredAreas.some(a => isAreaMatch(a, l.area || l.addressDescription));
        if (areaMatched) matchCount++;
      }

      // 2. Type
      let typeMatched = true;
      if (propertyTypes.length > 0) {
        totalCriteria++;
        typeMatched = propertyTypes.some(t => isTypeMatch(t, l.type, l.bedrooms, l.title));
        if (typeMatched) matchCount++;
      }

      // 3. Budget
      let budgetMatched = true;
      let budgetClose = true;
      if (budgetMax > 0) {
        totalCriteria++;
        budgetMatched = l.price <= budgetMax && (budgetMin === 0 || l.price >= budgetMin * 0.7);
        budgetClose = l.price <= budgetMax * 1.25;
        if (budgetMatched) matchCount++;
      }

      // 4. Must Haves
      let mustHavesMatched = true;
      if (mustHaves.length > 0) {
        totalCriteria++;
        const satisfied = mustHaves.filter(m => isAmenityMatch(m, l.amenities || [])).length;
        mustHavesMatched = satisfied >= Math.min(1, mustHaves.length);
        if (mustHavesMatched) matchCount++;
      }

      const isExact = areaMatched && typeMatched && budgetMatched && mustHavesMatched;
      const isClose = (areaMatched || typeMatched) && budgetClose;

      return {
        listing: l,
        isExact,
        isClose,
        score: totalCriteria > 0 ? Math.round((matchCount / totalCriteria) * 100) : 100
      };
    });

    const exactMatches = scored.filter(s => s.isExact).map(s => s.listing);
    const closeMatches = scored
      .filter(s => !s.isExact && s.isClose)
      .sort((a, b) => b.score - a.score)
      .map(s => s.listing);

    // If exact matches are scarce, supplement with top close matches so user gets high-value discovery
    const combined = [...exactMatches, ...closeMatches];
    const topPicks = combined.slice(0, 6);
    const totalCount = exactMatches.length > 0 ? exactMatches.length : closeMatches.length;

    return {
      exactMatches,
      closeMatches,
      totalCount: totalCount > 0 ? totalCount : listings.length,
      topPicks: topPicks.length > 0 ? topPicks : listings.slice(0, 4)
    };
  }
};

/**
 * Normalization & Smart Matching Utilities
 */
const AREA_ALIASES: Record<string, string[]> = {
  bodija: ['bodija', 'old bodija', 'new bodija'],
  akobo: ['akobo', 'akobo ojurin', 'general gas'],
  jericho: ['jericho', 'jericho gra', 'onireke'],
  ringroad: ['ring road', 'ringroad', 'alegongo', 'iyaganku', 'adeoyo'],
  uisamonda: ['ui', 'samonda', 'ui / samonda', 'ui area', 'polytechnic', 'sango', 'university of ibadan'],
  agodi: ['agodi', 'agodi gra', 'secretariat'],
  oluyole: ['oluyole', 'oluyole estate', 'new garage'],
  challenge: ['challenge', 'molete', 'felele', 'toll gate']
};

export function isAreaMatch(selectedAreaId: string, listingArea?: string): boolean {
  if (!listingArea) return true;
  const target = listingArea.toLowerCase().trim();
  const rawId = selectedAreaId.toLowerCase().replace(/[^a-z0-9]/g, '');

  const aliases = AREA_ALIASES[rawId] || [selectedAreaId.toLowerCase()];
  return aliases.some(a => target.includes(a) || a.includes(target));
}

export function isTypeMatch(
  selectedTypeId: string,
  listingType?: string,
  bedrooms?: number,
  title?: string
): boolean {
  if (!listingType) return true;
  const typeStr = listingType.toLowerCase();
  const titleStr = (title || '').toLowerCase();

  switch (selectedTypeId) {
    case 'selfcontain':
      return (
        typeStr.includes('self') ||
        typeStr.includes('studio') ||
        titleStr.includes('self-contain') ||
        titleStr.includes('self contain') ||
        titleStr.includes('studio') ||
        (bedrooms === 1 && !typeStr.includes('duplex'))
      );

    case 'flat1':
      return (
        (typeStr.includes('flat') || typeStr.includes('serviced')) &&
        (bedrooms === 1 || titleStr.includes('1-bed') || titleStr.includes('1 bed') || titleStr.includes('1 bedroom'))
      );

    case 'flat2':
      return (
        (typeStr.includes('flat') || typeStr.includes('serviced')) &&
        (bedrooms === 2 || titleStr.includes('2-bed') || titleStr.includes('2 bed') || titleStr.includes('2 bedroom'))
      );

    case 'duplex':
      return (
        typeStr.includes('duplex') ||
        typeStr.includes('house') ||
        typeStr.includes('bungalow') ||
        typeStr.includes('villa') ||
        titleStr.includes('duplex') ||
        titleStr.includes('penthouse') ||
        (bedrooms !== undefined && bedrooms >= 3)
      );

    default:
      return typeStr.includes(selectedTypeId.toLowerCase());
  }
}

export function isAmenityMatch(mustHaveId: string, amenities: string[] = []): boolean {
  const amList = amenities.map(a => a.toLowerCase());
  switch (mustHaveId) {
    case 'meter':
      return amList.some(a => a.includes('meter') || a.includes('prepaid') || a.includes('nepa'));
    case 'borehole':
      return amList.some(a => a.includes('water') || a.includes('borehole') || a.includes('running'));
    case 'security':
      return amList.some(a => a.includes('security') || a.includes('gated') || a.includes('guard') || a.includes('fence'));
    case 'parking':
      return amList.some(a => a.includes('park') || a.includes('car') || a.includes('garage'));
    case 'fibre':
      return amList.some(a => a.includes('fibre') || a.includes('fiber') || a.includes('wifi') || a.includes('internet'));
    default:
      return amList.some(a => a.includes(mustHaveId.toLowerCase()));
  }
}
