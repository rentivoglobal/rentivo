import { CityLocation } from '../types';
import { isLiveBackend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { localStore } from './localStore';
import { slugify } from '../lib/mappers';

export const locationsService = {
  getCities(): CityLocation[] {
    return localStore.getCities();
  },

  async loadCities(): Promise<CityLocation[]> {
    if (!isLiveBackend || !supabase) return localStore.getCities();
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
    localStore.saveCities(mapped);
    return mapped;
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
    const ibadan = this.getCities().find((c) => c.name === 'Ibadan');
    return ibadan ? ibadan.areas : [];
  },

  addCity(cityData: { name: string; state: string; isActive?: boolean; areas?: string[] }): CityLocation {
    const cities = localStore.getCities();
    const existing = cities.find((c) => c.name.toLowerCase() === cityData.name.toLowerCase());
    if (existing) return existing;
    const newCity: CityLocation = {
      id: localStore.createId('city'),
      name: cityData.name,
      state: cityData.state,
      isActive: cityData.isActive ?? true,
      isPilot: false,
      areas: cityData.areas || []
    };
    cities.push(newCity);
    localStore.saveCities(cities);
    if (isLiveBackend && supabase) {
      void supabase.from('cities').insert({
        name: newCity.name,
        slug: slugify(newCity.name),
        state: newCity.state,
        is_active: newCity.isActive,
        is_pilot: false
      });
    }
    return newCity;
  },

  addAreaToCity(cityName: string, areaName: string): boolean {
    const cities = localStore.getCities();
    const city = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (!city) return false;
    const trimmed = areaName.trim();
    if (!city.areas.includes(trimmed)) {
      city.areas.push(trimmed);
      localStore.saveCities(cities);
    }
    if (isLiveBackend && supabase) {
      void supabase.from('areas').insert({
        city_id: city.id,
        name: trimmed,
        slug: slugify(trimmed)
      });
    }
    return true;
  }
};
