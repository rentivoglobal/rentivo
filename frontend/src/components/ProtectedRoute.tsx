import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'tenant' | 'business_renter' | 'landlord' | 'agent' | 'admin'>;
  listerOnly?: boolean;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  listerOnly,
  adminOnly
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000052' }}>
        Loading account…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  if (listerOnly && user.role !== 'landlord' && user.role !== 'agent') {
    return <Navigate to="/signup?role=lister" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
