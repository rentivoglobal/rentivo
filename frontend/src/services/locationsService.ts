import { CityLocation, AreaLocation, IBADAN_AREAS } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/mappers';
import { localStore } from './localStore';

let cachedCities: CityLocation[] = [
  {
    id: 'city-ibadan',
    name: 'Ibadan',
    slug: 'ibadan',
    state: 'Oyo State',
    isActive: true,
    isPilot: true,
    areas: IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[],
    areaItems: (IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[]).map((name) => ({
      id: `area-${slugify(name)}`,
      cityId: 'city-ibadan',
      name,
      slug: slugify(name),
      isActive: true,
      listingCount: 0
    })),
    listingCount: 0
  }
];

export const locationsService = {
  getCities(): CityLocation[] {
    return cachedCities;
  },

  async loadCities(): Promise<CityLocation[]> {
    if (!isLiveBackend || !supabase) {
      const stored = localStore.getCities();
      if (stored && stored.length > 0) {
        cachedCities = stored;
      }
      return cachedCities;
    }

    try {
      // 1. Fetch cities ordered with pilot first, then alphabetical
      const { data: cities, error: citiesErr } = await supabase
        .from('cities')
        .select('*')
        .order('is_pilot', { ascending: false })
        .order('name');
      if (citiesErr) throw citiesErr;

      // 2. Fetch all areas
      const { data: areas, error: areasErr } = await supabase
        .from('areas')
        .select('*')
        .order('name');
      if (areasErr) throw areasErr;

      // 3. Aggregate listings count per city and area
      const { data: listings } = await supabase
        .from('listings')
        .select('city_id, area_id');

      const cityCounts: Record<string, number> = {};
      const areaCounts: Record<string, number> = {};

      (listings || []).forEach((row) => {
        if (row.city_id) cityCounts[row.city_id] = (cityCounts[row.city_id] || 0) + 1;
        if (row.area_id) areaCounts[row.area_id] = (areaCounts[row.area_id] || 0) + 1;
      });

      // 4. Map cities with rich area objects and listing counts
      const mapped: CityLocation[] = (cities || []).map((city) => {
        const cityAreas = (areas || []).filter((a) => a.city_id === city.id);
        const areaItems: AreaLocation[] = cityAreas.map((a) => ({
          id: a.id,
          cityId: a.city_id,
          name: a.name,
          slug: a.slug,
          isActive: a.is_active ?? true,
          listingCount: areaCounts[a.id] || 0
        }));

        return {
          id: city.id,
          name: city.name,
          slug: city.slug,
          state: city.state || '',
          isActive: city.is_active,
          isPilot: city.is_pilot,
          areas: areaItems.filter((a) => a.isActive).map((a) => a.name),
          areaItems,
          listingCount: cityCounts[city.id] || 0
        };
      });

      if (mapped.length > 0) {
        cachedCities = mapped;
        localStore.saveCities(mapped);
      }
      return cachedCities;
    } catch (err) {
      console.warn('Failed to load cities from Supabase, using cache:', err);
      return cachedCities;
    }
  },

  getActiveCities(): CityLocation[] {
    return this.getCities().filter((c) => c.isActive);
  },

  getCityByName(name: string): CityLocation | undefined {
    return this.getCities().find((c) => c.name.toLowerCase() === name.toLowerCase());
  },

  getCityById(id: string): CityLocation | undefined {
    return this.getCities().find((c) => c.id === id);
  },

  getAreasForCity(cityName: string = 'Ibadan', activeOnly: boolean = true): string[] {
    const city = this.getCityByName(cityName);
    if (!city) {
      const ibadan = this.getCities().find((c) => c.name.toLowerCase() === 'ibadan');
      if (!ibadan) return IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[];
      if (activeOnly && ibadan.areaItems && ibadan.areaItems.length > 0) {
        return ibadan.areaItems.filter((a) => a.isActive).map((a) => a.name);
      }
      return ibadan.areas;
    }

    if (activeOnly && city.areaItems && city.areaItems.length > 0) {
      return city.areaItems.filter((a) => a.isActive).map((a) => a.name);
    }
    return city.areas;
  },

  getAreaItemsForCity(cityNameOrId: string = 'Ibadan'): AreaLocation[] {
    const city = this.getCities().find(
      (c) => c.id === cityNameOrId || c.name.toLowerCase() === cityNameOrId.toLowerCase()
    );
    return city?.areaItems || [];
  },

  /* -------------------------------------------------------------
     CITY OPERATIONS (CRUD)
  ------------------------------------------------------------- */
  async addCity(cityData: {
    name: string;
    state: string;
    isActive?: boolean;
    isPilot?: boolean;
    initialAreas?: string[];
  }): Promise<CityLocation> {
    const trimmedName = cityData.name.trim();
    const trimmedState = cityData.state.trim();
    const slug = slugify(trimmedName);

    const existing = cachedCities.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === slug
    );
    if (existing) {
      throw new Error(`A city named "${trimmedName}" already exists in the registry.`);
    }

    let cityId = `city-${Date.now()}`;
    const isPilot = cityData.isPilot ?? false;
    const isActive = cityData.isActive ?? true;

    if (isLiveBackend && supabase) {
      const { data, error } = await supabase
        .from('cities')
        .insert({
          name: trimmedName,
          slug,
          state: trimmedState,
          is_active: isActive,
          is_pilot: isPilot
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to insert city into database.');
      }
      if (data) {
        cityId = data.id;
      }

      // Add initial areas if provided
      if (cityData.initialAreas && cityData.initialAreas.length > 0) {
        const areaRows = cityData.initialAreas
          .map((a) => a.trim())
          .filter(Boolean)
          .map((name) => ({
            city_id: cityId,
            name,
            slug: slugify(name),
            is_active: true
          }));

        if (areaRows.length > 0) {
          await supabase.from('areas').insert(areaRows);
        }
      }
    }

    const createdAreaItems: AreaLocation[] = (cityData.initialAreas || [])
      .map((a) => a.trim())
      .filter(Boolean)
      .map((name) => ({
        id: `area-${slugify(name)}-${Date.now()}`,
        cityId,
        name,
        slug: slugify(name),
        isActive: true,
        listingCount: 0
      }));

    const newCity: CityLocation = {
      id: cityId,
      name: trimmedName,
      slug,
      state: trimmedState,
      isActive,
      isPilot,
      areas: createdAreaItems.map((a) => a.name),
      areaItems: createdAreaItems,
      listingCount: 0
    };

    cachedCities.push(newCity);
    localStore.saveCities(cachedCities);
    await this.loadCities();
    return this.getCityById(cityId) || newCity;
  },

  async updateCity(
    cityId: string,
    updates: Partial<{ name: string; state: string; isActive: boolean; isPilot: boolean }>
  ): Promise<CityLocation> {
    const target = this.getCityById(cityId);
    if (!target) throw new Error('City not found.');

    if (isLiveBackend && supabase) {
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) {
        patch.name = updates.name.trim();
        patch.slug = slugify(updates.name.trim());
      }
      if (updates.state !== undefined) patch.state = updates.state.trim();
      if (updates.isActive !== undefined) patch.is_active = updates.isActive;
      if (updates.isPilot !== undefined) patch.is_pilot = updates.isPilot;

      const { error } = await supabase.from('cities').update(patch).eq('id', cityId);
      if (error) throw new Error(error.message || 'Failed to update city in database.');
    }

    if (updates.name !== undefined) {
      target.name = updates.name.trim();
      target.slug = slugify(updates.name.trim());
    }
    if (updates.state !== undefined) target.state = updates.state.trim();
    if (updates.isActive !== undefined) target.isActive = updates.isActive;
    if (updates.isPilot !== undefined) target.isPilot = updates.isPilot;

    localStore.saveCities(cachedCities);
    await this.loadCities();
    return this.getCityById(cityId) || target;
  },

  async toggleCityActive(cityId: string, isActive: boolean): Promise<CityLocation> {
    return this.updateCity(cityId, { isActive });
  },

  async setPilotCity(cityId: string): Promise<CityLocation> {
    if (isLiveBackend && supabase) {
      // Clear pilot on all other cities first
      await supabase.from('cities').update({ is_pilot: false }).neq('id', cityId);
      // Set pilot on target city
      const { error } = await supabase
        .from('cities')
        .update({ is_pilot: true, is_active: true })
        .eq('id', cityId);
      if (error) throw new Error(error.message || 'Failed to designate pilot city.');
    }

    cachedCities.forEach((c) => {
      c.isPilot = c.id === cityId;
      if (c.id === cityId) c.isActive = true;
    });

    localStore.saveCities(cachedCities);
    await this.loadCities();
    return this.getCityById(cityId)!;
  },

  async deleteCity(cityId: string): Promise<{
    success: boolean;
    error?: string;
    hasListings?: boolean;
    listingCount?: number;
  }> {
    const target = this.getCityById(cityId);
    if (!target) return { success: false, error: 'City not found.' };

    if (isLiveBackend && supabase) {
      // Relational check: count listings referencing this city
      const { count, error: countErr } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('city_id', cityId);

      if (countErr) {
        console.warn('Listing check error:', countErr);
      }

      if (count && count > 0) {
        return {
          success: false,
          hasListings: true,
          listingCount: count,
          error: `Cannot delete "${target.name}": ${count} listing(s) are currently attached to this city. Deactivate it instead to suspend operations without breaking data integrity.`
        };
      }

      // Delete child areas first, then delete city
      await supabase.from('areas').delete().eq('city_id', cityId);
      const { error: delErr } = await supabase.from('cities').delete().eq('id', cityId);
      if (delErr) {
        throw new Error(delErr.message || 'Failed to delete city from database.');
      }
    }

    cachedCities = cachedCities.filter((c) => c.id !== cityId);
    localStore.saveCities(cachedCities);
    return { success: true };
  },

  /* -------------------------------------------------------------
     NEIGHBORHOOD / AREA OPERATIONS (CRUD)
  ------------------------------------------------------------- */
  async addAreaToCity(cityNameOrId: string, areaName: string): Promise<AreaLocation> {
    const trimmed = areaName.trim();
    if (!trimmed) throw new Error('Neighborhood name cannot be blank.');

    const city = cachedCities.find(
      (c) => c.id === cityNameOrId || c.name.toLowerCase() === cityNameOrId.toLowerCase()
    );
    if (!city) throw new Error(`Target city not found in coverage directory.`);

    const slug = slugify(trimmed);

    // Check duplicate in city
    const existing = (city.areaItems || []).find(
      (a) => a.slug === slug || a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      if (!existing.isActive) {
        // Re-activate if was inactive
        return this.toggleAreaActive(existing.id, true);
      }
      throw new Error(`"${trimmed}" is already registered in ${city.name}.`);
    }

    let areaId = `area-${slug}-${Date.now()}`;

    if (isLiveBackend && supabase) {
      const { data, error } = await supabase
        .from('areas')
        .insert({
          city_id: city.id,
          name: trimmed,
          slug,
          is_active: true
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to insert area into database.');
      }
      if (data) {
        areaId = data.id;
      }
    }

    const newArea: AreaLocation = {
      id: areaId,
      cityId: city.id,
      name: trimmed,
      slug,
      isActive: true,
      listingCount: 0
    };

    if (!city.areaItems) city.areaItems = [];
    city.areaItems.push(newArea);
    if (!city.areas.includes(trimmed)) city.areas.push(trimmed);

    localStore.saveCities(cachedCities);
    return newArea;
  },

  async updateArea(
    areaId: string,
    updates: Partial<{ name: string; isActive: boolean }>
  ): Promise<AreaLocation> {
    let foundArea: AreaLocation | undefined;
    let parentCity: CityLocation | undefined;

    for (const c of cachedCities) {
      const match = c.areaItems?.find((a) => a.id === areaId);
      if (match) {
        foundArea = match;
        parentCity = c;
        break;
      }
    }

    if (!foundArea || !parentCity) throw new Error('Neighborhood not found in registry.');

    if (isLiveBackend && supabase) {
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) {
        patch.name = updates.name.trim();
        patch.slug = slugify(updates.name.trim());
      }
      if (updates.isActive !== undefined) patch.is_active = updates.isActive;

      const { error } = await supabase.from('areas').update(patch).eq('id', areaId);
      if (error) throw new Error(error.message || 'Failed to update neighborhood in database.');
    }

    if (updates.name !== undefined) {
      foundArea.name = updates.name.trim();
      foundArea.slug = slugify(updates.name.trim());
    }
    if (updates.isActive !== undefined) {
      foundArea.isActive = updates.isActive;
    }

    // Refresh string areas array
    parentCity.areas = (parentCity.areaItems || [])
      .filter((a) => a.isActive)
      .map((a) => a.name);

    localStore.saveCities(cachedCities);
    return foundArea;
  },

  async toggleAreaActive(areaId: string, isActive: boolean): Promise<AreaLocation> {
    return this.updateArea(areaId, { isActive });
  },

  async deleteArea(areaId: string): Promise<{
    success: boolean;
    error?: string;
    hasListings?: boolean;
    listingCount?: number;
  }> {
    let foundArea: AreaLocation | undefined;
    let parentCity: CityLocation | undefined;

    for (const c of cachedCities) {
      const match = c.areaItems?.find((a) => a.id === areaId);
      if (match) {
        foundArea = match;
        parentCity = c;
        break;
      }
    }

    if (!foundArea || !parentCity) {
      return { success: false, error: 'Neighborhood not found.' };
    }

    if (isLiveBackend && supabase) {
      // Relational check: count listings referencing this area
      const { count, error: countErr } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', areaId);

      if (countErr) {
        console.warn('Area listing check error:', countErr);
      }

      if (count && count > 0) {
        return {
          success: false,
          hasListings: true,
          listingCount: count,
          error: `Cannot delete "${foundArea.name}": ${count} listing(s) are located in this neighborhood. Deactivate it instead to hide it from new listings while preserving history.`
        };
      }

      const { error: delErr } = await supabase.from('areas').delete().eq('id', areaId);
      if (delErr) {
        throw new Error(delErr.message || 'Failed to delete neighborhood from database.');
      }
    }

    parentCity.areaItems = (parentCity.areaItems || []).filter((a) => a.id !== areaId);
    parentCity.areas = parentCity.areas.filter((name) => name !== foundArea!.name);

    localStore.saveCities(cachedCities);
    return { success: true };
  }
};
