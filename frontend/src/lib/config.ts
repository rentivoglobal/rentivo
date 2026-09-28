export const ACCESS_FEE_KOBO = Number(import.meta.env.VITE_ACCESS_FEE_KOBO || 500000);
export const ACCESS_FEE_NAIRA = ACCESS_FEE_KOBO / 100;
export const PROMO_CAP = Number(import.meta.env.VITE_PROMO_CAP || 100);
export const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

export const isLiveBackend = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const isDemoSimulator =
  import.meta.env.VITE_DEMO_SIMULATOR === 'true' ||
  (Boolean(import.meta.env.DEV) && import.meta.env.VITE_DEMO_SIMULATOR !== 'false');

export const imagekitPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '';
export const imagekitUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '';
export const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_12d2be5b59ea1d89d379a84cdf74b8b5e15a759e';
