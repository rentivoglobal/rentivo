import { CityLocation, IBADAN_AREAS } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/mappers';

let cachedCities: CityLocation[] = [
  {
    id: 'city-ibadan',
    name: 'Ibadan',
    state: 'Oyo State',
    isActive: true,
    isPilot: true,
    areas: IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[]
  }
];

export const locationsService = {
  getCities(): CityLocation[] {
    return cachedCities;
  },

  async loadCities(): Promise<CityLocation[]> {
    if (!isLiveBackend || !supabase) return cachedCities;
    try {
      const { data: cities, error } = await supabase.from('cities').select('*').order('name');
      if (error) throw error;
      const { data: areas } = await supabase.from('areas').select('*').order('name');
      const mapped: CityLocation[] = (cities || []).map((city) => ({
        id: city.id,
        name: city.name,
        state: city.state || '',
        isActive: city.is_active,
        isPilot: city.is_pilot,
        areas: (areas || []).filter((a) => a.city_id === city.id).map((a) => a.name)
      }));
      if (mapped.length > 0) {
        cachedCities = mapped;
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

  getAreasForCity(cityName: string = 'Ibadan'): string[] {
    const city = this.getCityByName(cityName);
    if (city && city.areas.length > 0) return city.areas;
    const ibadan = this.getCities().find((c) => c.name.toLowerCase() === 'ibadan');
    return ibadan ? ibadan.areas : (IBADAN_AREAS.filter((a) => a !== 'All Ibadan areas') as unknown as string[]);
  },

  async addCity(cityData: { name: string; state: string; isActive?: boolean; areas?: string[] }): Promise<CityLocation> {
    const existing = cachedCities.find((c) => c.name.toLowerCase() === cityData.name.toLowerCase());
    if (existing) return existing;

    let cityId = `city-${Date.now()}`;
    if (isLiveBackend && supabase) {
      const { data, error } = await supabase.from('cities').insert({
        name: cityData.name,
        slug: slugify(cityData.name),
        state: cityData.state,
        is_active: cityData.isActive ?? true,
        is_pilot: false
      }).select('id').single();
      if (!error && data) {
        cityId = data.id;
      }
    }

    const newCity: CityLocation = {
      id: cityId,
      name: cityData.name,
      state: cityData.state,
      isActive: cityData.isActive ?? true,
      isPilot: false,
      areas: cityData.areas || []
    };
    cachedCities.push(newCity);
    return newCity;
  },

  async addAreaToCity(cityName: string, areaName: string): Promise<boolean> {
    const city = cachedCities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (!city) return false;
    const trimmed = areaName.trim();
    if (!city.areas.includes(trimmed)) {
      city.areas.push(trimmed);
    }
    if (isLiveBackend && supabase) {
      await supabase.from('areas').insert({
        city_id: city.id,
        name: trimmed,
        slug: slugify(trimmed)
      });
    }
    return true;
  }
};
