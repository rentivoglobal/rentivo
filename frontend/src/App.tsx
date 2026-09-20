import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { RequestsPage } from './pages/RequestsPage';
import { ListerDashboardPage } from './pages/ListerDashboardPage';
import { AdminQueuePage } from './pages/AdminQueuePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ListingEditorPage } from './pages/ListingEditorPage';
import { AuthPage } from './pages/AuthPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AccessFeeTermsPage } from './pages/AccessFeeTermsPage';
import { AvailabilityActionPage } from './pages/AvailabilityActionPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AccountPage } from './pages/AccountPage';
import { ListerVerificationPage } from './pages/ListerVerificationPage';
import { ListPropertyLandingPage } from './pages/ListPropertyLandingPage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Listing, FilterOptions, NavigationTab, AccessRequest } from './types';
import { listingsService } from './services/listingsService';
import { locationsService } from './services/locationsService';
import { requestsService } from './services/requestsService';
import { useAuth } from './contexts/AuthContext';
import { FOOTER_TABS, HASH_TO_PATH, STANDALONE_TABS, pathForTab, tabFromPathname } from './lib/navigation';

const HashRedirect: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const raw = window.location.hash.replace('#', '').split('?')[0];
    if (raw && HASH_TO_PATH[raw]) {
      navigate(HASH_TO_PATH[raw] + window.location.hash.replace(/^#[^?]*/, ''), { replace: true });
    }
  }, [navigate]);
  return null;
};

export const App: React.FC = () => {
  const { user, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = tabFromPathname(location.pathname);
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    type: 'All Types',
    area: 'All Ibadan areas',
    verifiedOnly: false,
    searchQuery: '',
    sortBy: 'newest'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    const [list, favs] = await Promise.all([
      listingsService.getListings(filters),
      listingsService.loadFavorites()
    ]);
    setListings(list);
    setFavorites(favs);
    await locationsService.loadCities().catch(() => undefined);
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (location.pathname !== '/search') return;
    const area = searchParams.get('area');
    const q = searchParams.get('q');
    setFilters((prev) => ({
      ...prev,
      area: area || 'All Ibadan areas',
      searchQuery: q ?? prev.searchQuery
    }));
  }, [location.pathname, searchParams]);

  const handleNavigate = (tab: NavigationTab) => {
    if ((tab === 'lister' || tab === 'listing_editor') && (!user || (user.role !== 'landlord' && user.role !== 'agent'))) {
      navigate('/signup?role=lister');
      showToast('Please sign in as a landlord or agent to access the Lister Portal.');
      return;
    }
    if ((tab === 'requests' || tab === 'profile') && !user) {
      navigate(`/login?next=${encodeURIComponent(pathForTab(tab))}`);
      showToast('Please sign in to continue.');
      return;
    }
    navigate(pathForTab(tab));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin', role: 'renter' | 'lister' = 'renter') => {
    navigate(pathForTab('auth', { authMode: mode, authRole: role }));
  };

  const handleAuthSuccess = async (tabToRedirect?: NavigationTab) => {
    await refresh();
    const nextPath = new URLSearchParams(location.search).get('next');
    if (nextPath && nextPath.startsWith('/')) {
      showToast('Signed in successfully.');
      navigate(nextPath);
      return;
    }
    const nextUser = await import('./services/authService').then((m) => m.authService.getSessionUser());
    const target = tabToRedirect || (nextUser?.role === 'admin' ? 'admin' : nextUser && (nextUser.role === 'landlord' || nextUser.role === 'agent') ? 'lister' : 'search');
    showToast('Signed in successfully.');
    navigate(pathForTab(target));
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await listingsService.toggleFavorite(id);
    setFavorites(updated);
    showToast(updated.includes(id) ? 'Saved to your favorites!' : 'Removed from favorites.');
  };

  const handleSelectListing = (listing: Listing) => {
    navigate(`/listings/${listing.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestAccess = (listing: Listing) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/listings/${listing.id}/request`)}&role=renter`);
      showToast('Sign in to request access. It is free until vacancy is confirmed.');
      return;
    }
    navigate(`/listings/${listing.id}/request`);
  };

  const showNavbar = !STANDALONE_TABS.includes(currentTab) && !location.pathname.startsWith('/lister') && !location.pathname.startsWith('/admin') && location.pathname !== '/search';
  const showFooter = FOOTER_TABS.includes(currentTab) || location.pathname.startsWith('/account');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HashRedirect />
      {showNavbar && (
        <Navbar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          currentUser={user}
          onSignOut={() => { void signOut(); navigate('/'); }}
          onOpenAuth={handleOpenAuth}
          favoritesCount={favorites.length}
        />
      )}

      <main style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                listings={listings}
                onNavigateToMarketplace={(area) => {
                  if (area && area !== 'All Ibadan areas') setFilters((prev) => ({ ...prev, area }));
                  navigate(area && area !== 'All Ibadan areas' ? `/search?area=${encodeURIComponent(area)}` : '/search');
                }}
                onSelectListing={handleSelectListing}
                onOpenAuth={() => handleOpenAuth('signup', 'renter')}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchPage
                listings={listings as never}
                favorites={favorites}
                filters={filters}
                onFilterChange={(up) => setFilters((prev) => ({ ...prev, ...up }))}
                onToggleFavorite={handleToggleFavorite}
                onSelectListing={handleSelectListing}
                onRequestAccess={handleRequestAccess}
                onNavigateHome={() => navigate('/')}
                onNavigateToFavorites={() => handleNavigate('favorites')}
                onNavigateToRequests={() => handleNavigate('requests')}
                onNavigateToProfile={() => handleNavigate('profile')}
                currentUser={user}
                onSignOut={() => { void signOut(); navigate('/'); }}
                onOpenAuth={handleOpenAuth}
                onPostListing={() => {
                  if (user?.role === 'landlord' || user?.role === 'agent') navigate('/lister/listings/new');
                  else navigate('/list-property');
                }}
              />
            }
          />
          <Route path="/listings/:id" element={<ListingDetailRoute favorites={favorites} onToggleFavorite={handleToggleFavorite} onRequestAccess={handleRequestAccess} />} />
          <Route path="/listings/:id/request" element={<ProtectedRoute><CheckoutRoute /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><CheckoutRoute /></ProtectedRoute>} />
          <Route path="/how-it-works" element={<HowItWorksPage onBrowseProperties={() => navigate('/search')} onPostListing={() => handleOpenAuth('signup', 'lister')} />} />
          <Route 
            path="/list-property" 
            element={
              <ListPropertyLandingPage
                currentUser={user}
                onStartListing={() => {
                  if (user?.role === 'landlord' || user?.role === 'agent') navigate('/lister/listings/new');
                  else handleOpenAuth('signup', 'lister');
                }}
                onSignIn={() => handleOpenAuth('signin', 'lister')}
                onBrowseMarketplace={() => navigate('/search')}
              />
            } 
          />
          <Route path="/post-property" element={<Navigate to="/list-property" replace />} />
          <Route path="/for-owners" element={<Navigate to="/list-property" replace />} />
          <Route path="/terms" element={<TermsPage onBack={() => navigate(-1)} onNavigateToTab={handleNavigate} />} />
          <Route path="/privacy" element={<PrivacyPage onBack={() => navigate(-1)} onNavigateToTab={handleNavigate} />} />
          <Route path="/access-fee-terms" element={<AccessFeeTermsPage onBack={() => navigate(-1)} onBrowseListings={() => navigate('/search')} onNavigateToTab={handleNavigate} />} />
          <Route path="/login" element={<AuthRoute mode="signin" onSuccess={handleAuthSuccess} />} />
          <Route path="/signup" element={<AuthRoute mode="signup" onSuccess={handleAuthSuccess} />} />
          <Route path="/forgot-password" element={<AuthRoute mode="forgot" onSuccess={handleAuthSuccess} />} />
          <Route path="/reset-password" element={<ResetPasswordPage onSuccess={() => { showToast('Password updated. Sign in with your new password.'); navigate('/login'); }} onNavigateHome={() => navigate('/')} />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage
                  listings={listings}
                  favorites={favorites}
                  onNavigateToTab={handleNavigate}
                  onSelectListing={handleSelectListing}
                  onOpenRequest={(req) => navigate(`/requests/${req.id}`)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/requests"
            element={
              <ProtectedRoute>
                <RequestsPage
                  listings={listings}
                  favorites={favorites}
                  onBrowseListings={() => navigate('/search')}
                  onNavigateToFavorites={() => handleNavigate('favorites')}
                  onSelectListing={handleSelectListing}
                  onProceedToCheckout={(listing) => navigate(`/listings/${listing.id}/request`)}
                  onOpenRequestModal={(id) => navigate(`/listings/${id}/request`)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage
                  favorites={favorites}
                  listings={listings}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectListing={handleSelectListing}
                  onRequestAccess={handleRequestAccess}
                  onBrowseListings={() => navigate('/search')}
                  onNavigateToRequests={() => handleNavigate('requests')}
                  onProceedToCheckout={(listing) => navigate(`/listings/${listing.id}/request`)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <ProfilePage
                  currentUser={user}
                  onUpdateUser={() => { void refresh(); showToast('Profile updated successfully.'); }}
                  onBack={() => navigate(-1)}
                  onNavigateToTab={handleNavigate}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/lister" element={<ProtectedRoute listerOnly><ListerRoute listings={listings} onReload={loadData} showToast={showToast} /></ProtectedRoute>} />
          <Route path="/lister/listings" element={<ProtectedRoute listerOnly><ListerRoute listings={listings} onReload={loadData} showToast={showToast} tab="listings" /></ProtectedRoute>} />
          <Route path="/lister/requests" element={<ProtectedRoute listerOnly><ListerRoute listings={listings} onReload={loadData} showToast={showToast} tab="inquiries" /></ProtectedRoute>} />
          <Route path="/lister/verification" element={<ProtectedRoute listerOnly><ListerVerificationPage listings={listings} onBack={() => navigate('/lister')} /></ProtectedRoute>} />
          <Route path="/lister/listings/new" element={<ProtectedRoute listerOnly><ListingEditorPage initialListing={null} onSaveSuccess={() => { void loadData(); showToast('Listing submitted for admin review.'); navigate('/lister/listings'); }} onCancel={() => navigate('/lister')} /></ProtectedRoute>} />
          <Route path="/lister/listings/:id/edit" element={<ProtectedRoute listerOnly><EditListingRoute onReload={loadData} showToast={showToast} /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminQueuePage listings={listings} onApproveVerification={(id) => { void listingsService.issueVerifiedBadge(id); showToast('Verified badge issued.'); }} onExit={() => navigate('/')} /></ProtectedRoute>} />
          <Route path="/admin/:section" element={<ProtectedRoute adminOnly><AdminSectionRoute listings={listings} showToast={showToast} /></ProtectedRoute>} />
          <Route path="/availability/action" element={<AvailabilityActionPage onNavigateHome={() => navigate('/')} onNavigateToLister={() => navigate('/lister')} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showFooter && <Footer onNavigate={handleNavigate} />}

      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ListingDetailRoute: React.FC<{
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onRequestAccess: (listing: Listing) => void;
}> = ({ favorites, onToggleFavorite, onRequestAccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void listingsService.getListingById(id).then((found) => {
      setListing(found || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#000052' }}>Loading listing…</div>;
  if (!listing) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, backgroundColor: '#FFFFFF', padding: '36px 24px', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#000052' }}>Listing unavailable</h2>
          <p style={{ fontSize: 14, color: '#636377', marginBottom: 24 }}>This property is missing, pending admin review, or no longer public.</p>
          <button type="button" onClick={() => navigate('/search')} style={{ backgroundColor: '#000052', color: '#fff', padding: '10px 24px', borderRadius: 999, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Browse available properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <PropertyDetailPage
      listing={listing}
      isFavorite={favorites.includes(listing.id)}
      onToggleFavorite={onToggleFavorite}
      onBack={() => navigate('/search')}
      onRequestAccess={onRequestAccess}
    />
  );
};

const CheckoutRoute: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const isRequestUrl = location.pathname.startsWith('/requests/');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      if (params.id && isRequestUrl) {
        const req = await requestsService.getRequestById(params.id);
        setRequest(req || null);
        if (req) {
          const found = await listingsService.getListingById(req.listingId);
          setListing(found || null);
        }
        setLoading(false);
        return;
      }
      if (params.id) {
        const found = await listingsService.getListingById(params.id);
        setListing(found || null);
      }
      setLoading(false);
    };
    void run();
  }, [params.id, isRequestUrl]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#000052' }}>Loading request…</div>;
  }

  if (isRequestUrl && !request) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, backgroundColor: '#FFFFFF', padding: '36px 24px', borderRadius: 20, border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#000052' }}>Request not found</h2>
          <p style={{ fontSize: 14, color: '#636377', marginBottom: 24 }}>This access request may have expired or does not belong to this account.</p>
          <button type="button" onClick={() => navigate('/account/requests')} style={{ backgroundColor: '#000052', color: '#fff', padding: '10px 24px', borderRadius: 999, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            View my requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <CheckoutPage
      listing={listing}
      existingRequest={request}
      onCreated={(created) => navigate(`/requests/${created.id}`, { replace: true })}
      onBack={() => navigate(listing ? `/listings/${listing.id}` : '/search')}
      onBrowseListings={() => navigate('/search')}
    />
  );
};

const AuthRoute: React.FC<{ mode: 'signin' | 'signup' | 'forgot'; onSuccess: (tab?: NavigationTab) => void }> = ({
  mode,
  onSuccess
}) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = params.get('role') === 'lister' ? 'lister' : 'renter';
  return (
    <AuthPage
      initialMode={mode}
      initialRole={role}
      onAuthSuccess={onSuccess}
      onNavigateHome={() => navigate('/')}
    />
  );
};

const ListerRoute: React.FC<{
  listings: Listing[];
  onReload: () => Promise<void>;
  showToast: (msg: string) => void;
  tab?: 'listings' | 'inquiries' | 'stats';
}> = ({ listings, onReload, showToast, tab }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  return (
    <ListerDashboardPage
      listings={listings}
      forcedTab={tab}
      onListingCreated={() => { void onReload(); showToast('Listing saved.'); }}
      onSelectListingToView={(listing) => navigate(`/listings/${listing.id}`)}
      onOpenCreateListing={() => navigate('/lister/listings/new')}
      onOpenEditListing={(listing) => navigate(`/lister/listings/${listing.id}/edit`)}
      onNavigateToMarketplace={() => navigate('/search')}
      onOpenVerification={() => navigate('/lister/verification')}
      onOpenRequests={() => navigate('/lister/requests')}
      onNavigateToProfile={() => navigate('/account/profile')}
      onSignOut={() => { void signOut(); navigate('/'); }}
    />
  );
};

const EditListingRoute: React.FC<{ onReload: () => Promise<void>; showToast: (msg: string) => void }> = ({ onReload, showToast }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    if (!id) return;
    void listingsService.getListingById(id).then((found) => setListing(found || null));
  }, [id]);
  if (!listing) return <div style={{ padding: 48 }}>Loading editor…</div>;
  return (
    <ListingEditorPage
      initialListing={listing}
      onSaveSuccess={() => { void onReload(); showToast('Listing updated.'); navigate('/lister/listings'); }}
      onCancel={() => navigate('/lister')}
      onDelete={async (listingId) => {
        await listingsService.deleteListing(listingId);
        showToast('Listing removed.');
        navigate('/lister/listings');
      }}
    />
  );
};

const AdminSectionRoute: React.FC<{ listings: Listing[]; showToast: (msg: string) => void }> = ({ listings, showToast }) => {
  const { section } = useParams();
  const navigate = useNavigate();
  return (
    <AdminQueuePage
      listings={listings}
      initialSection={section as never}
      onApproveVerification={(id) => { void listingsService.issueVerifiedBadge(id); showToast('Verified badge issued.'); }}
      onExit={() => navigate('/')}
    />
  );
};

export default App;
