import { NavigationTab } from '../types';

export const HASH_TO_PATH: Record<string, string> = {
  home: '/',
  account: '/account',
  search: '/search',
  detail: '/search',
  checkout: '/account/requests',
  requests: '/account/requests',
  favorites: '/account/favorites',
  how_it_works: '/how-it-works',
  list_property: '/lister/listings/new',
  terms: '/terms',
  privacy: '/privacy',
  access_fee_terms: '/access-fee-terms',
  profile: '/account/profile',
  reset_password: '/reset-password',
  availability_action: '/availability/action',
  lister: '/lister',
  listing_editor: '/lister/listings/new',
  admin: '/admin',
  auth: '/login'
};

export function pathForTab(
  tab: NavigationTab,
  extra?: {
    listingId?: string;
    requestId?: string;
    authMode?: 'signin' | 'signup' | 'forgot' | 'admin';
    authRole?: 'renter' | 'lister';
    adminSection?: string;
    listerTab?: string;
  }
): string {
  switch (tab) {
    case 'home':
      return '/';
    case 'account':
      return '/account';
    case 'search':
      return '/search';
    case 'detail':
      return extra?.listingId ? `/listings/${extra.listingId}` : '/search';
    case 'checkout':
      return '/account/requests';
    case 'requests':
      return '/account/requests';
    case 'favorites':
      return '/account/favorites';
    case 'how_it_works':
      return '/how-it-works';
    case 'list_property':
      return '/lister/listings/new';
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'access_fee_terms':
      return '/access-fee-terms';
    case 'profile':
      return '/account/profile';
    case 'reset_password':
      return '/reset-password';
    case 'availability_action':
      return '/availability/action';
    case 'lister':
      return extra?.listerTab === 'verification'
        ? '/lister/verification'
        : extra?.listerTab === 'requests'
          ? '/lister/requests'
          : extra?.listerTab === 'listings'
            ? '/lister/listings'
            : extra?.listerTab === 'profile' || extra?.listerTab === 'account'
              ? '/lister/account'
              : '/lister';
    case 'listing_editor':
      return extra?.listingId ? `/lister/listings/${extra.listingId}/edit` : '/lister/listings/new';
    case 'admin':
      return extra?.adminSection ? `/admin/${extra.adminSection}` : '/admin';
    case 'auth': {
      const mode = extra?.authMode || 'signin';
      const role = extra?.authRole ? `?role=${extra.authRole}` : '';
      if (mode === 'signup') return `/signup${role}`;
      if (mode === 'forgot') return '/forgot-password';
      return `/login${role}`;
    }
    default:
      return '/';
  }
}

export function tabFromPathname(pathname: string): NavigationTab {
  if (pathname === '/') return 'home';
  if (pathname === '/account') return 'account';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/listings')) {
    return pathname.endsWith('/request') ? 'checkout' : 'detail';
  }
  if (pathname.startsWith('/requests')) return 'checkout';
  if (pathname.startsWith('/account/requests')) return 'requests';
  if (pathname.startsWith('/account/favorites')) return 'favorites';
  if (pathname.startsWith('/account/profile')) return 'profile';
  if (pathname.startsWith('/account/search')) return 'search';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/how-it-works')) return 'how_it_works';
  if (pathname.startsWith('/terms')) return 'terms';
  if (pathname.startsWith('/privacy')) return 'privacy';
  if (pathname.startsWith('/access-fee-terms')) return 'access_fee_terms';
  if (pathname.startsWith('/reset-password')) return 'reset_password';
  if (pathname.startsWith('/availability/action')) return 'availability_action';
  if (pathname.startsWith('/lister/listings/new') || /\/lister\/listings\/.+\/edit/.test(pathname)) {
    return 'listing_editor';
  }
  if (pathname.startsWith('/lister')) return 'lister';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/auth')) {
    return 'auth';
  }
  return 'home';
}

export const STANDALONE_TABS: NavigationTab[] = [
  'search',
  'detail',
  'lister',
  'listing_editor',
  'admin',
  'auth',
  'availability_action',
  'reset_password'
];

export const FOOTER_TABS: NavigationTab[] = [
  'home',
  'search',
  'how_it_works',
  'terms',
  'privacy',
  'access_fee_terms'
];
