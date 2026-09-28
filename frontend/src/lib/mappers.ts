import { PropertyType } from '../types';

export const UI_TO_DB_TYPE: Record<string, string> = {
  'self-contain': 'self_contain',
  'self_contain': 'self_contain',
  flat: 'flat_apartment',
  'flat / apartment': 'flat_apartment',
  apartment: 'flat_apartment',
  duplex: 'duplex',
  bungalow: 'bungalow',
  house: 'house',
  shop: 'shop',
  office: 'office_space',
  'office space': 'office_space',
  warehouse: 'warehouse',
  land: 'land',
  shortlet: 'shortlet',
  'short-let': 'shortlet'
};

export const DB_TO_UI_TYPE: Record<string, PropertyType> = {
  self_contain: 'Self-Contain',
  flat_apartment: 'Flat',
  duplex: 'Duplex',
  bungalow: 'Bungalow',
  house: 'House',
  shop: 'Shop',
  office_space: 'Office',
  warehouse: 'Warehouse',
  land: 'Land',
  shortlet: 'Short-let'
};

export function mapUiTypeToDb(type: string): string {
  if (!type) return 'flat_apartment';
  const clean = type.toLowerCase().trim();
  if (UI_TO_DB_TYPE[clean]) return UI_TO_DB_TYPE[clean];
  return clean.replace(/[\s\/-]+/g, '_');
}

export function mapDbTypeToUi(dbType: string): string {
  if (!dbType) return 'Flat';
  if (DB_TO_UI_TYPE[dbType]) return DB_TO_UI_TYPE[dbType];
  return dbType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

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
