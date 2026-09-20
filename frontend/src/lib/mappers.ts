import { PropertyType } from '../types';

export const UI_TO_DB_TYPE: Record<PropertyType, string> = {
  'Self-Contain': 'self_contain',
  Flat: 'flat_apartment',
  Duplex: 'duplex',
  Bungalow: 'bungalow',
  Shop: 'shop',
  Office: 'office_space',
  Warehouse: 'warehouse',
  Land: 'land'
};

export const DB_TO_UI_TYPE: Record<string, PropertyType> = {
  self_contain: 'Self-Contain',
  flat_apartment: 'Flat',
  duplex: 'Duplex',
  bungalow: 'Bungalow',
  shop: 'Shop',
  office_space: 'Office',
  warehouse: 'Warehouse',
  land: 'Land'
};

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return Math.round(kobo / 100);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function maskListerContact<T extends { phone?: string; whatsapp?: string }>(lister: T): T {
  return {
    ...lister,
    phone: '',
    whatsapp: ''
  };
}
