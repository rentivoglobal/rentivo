/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_IMAGEKIT_PUBLIC_KEY: string;
  readonly VITE_IMAGEKIT_URL_ENDPOINT: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_ACCESS_FEE_KOBO: string;
  readonly VITE_PROMO_CAP: string;
  readonly VITE_DEMO_SIMULATOR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface PaystackPopInstance {
  newTransaction: (options: {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    ref?: string;
    metadata?: Record<string, unknown>;
    callback?: (response: { reference: string }) => void;
    onClose?: () => void;
  }) => void;
}

interface Window {
  PaystackPop?: PaystackPopInstance;
}
