import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RenterLandlordGateProps {
  userEmail?: string;
  onReturnToPortal?: () => void;
}

export const RenterLandlordGate: React.FC<RenterLandlordGateProps> = ({
  userEmail,
  onReturnToPortal
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleRegisterAsLister = async () => {
    // Sign out from renter session and route cleanly to lister registration
    await signOut();
    navigate('/signup?role=lister');
  };

  const handleReturn = () => {
    if (onReturnToPortal) {
      onReturnToPortal();
    } else {
      navigate('/account');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      {/* Top Bar */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/RENTIVO-lockup.svg" alt="Rentivo" style={{ height: '30px' }} />
        </div>
        <button
          type="button"
          onClick={handleReturn}
          style={{
            background: 'none',
            border: 'none',
            color: '#000052',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Renter Portal</span>
        </button>
      </header>

      {/* Main Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 8px 30px rgba(0, 0, 82, 0.08)',
          maxWidth: '520px',
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center'
        }}>
          {/* Badge & Icon */}
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: '#F0E6FF',
            color: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid #E9D5FF'
          }}>
            <Building2 size={34} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#DC2626',
            backgroundColor: '#FEE2E2',
            padding: '4px 12px',
            borderRadius: '999px',
            marginBottom: '12px'
          }}>
            <ShieldAlert size={14} />
            <span>Restricted Access</span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: '24px',
            fontWeight: 800,
            color: '#000052',
            margin: '0 0 8px',
            lineHeight: 1.25
          }}>
            Landlord Registration Required
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#64748B',
            lineHeight: 1.6,
            margin: '0 0 24px'
          }}>
            You are currently signed in as a <b>Renter</b> {userEmail ? `(${userEmail})` : ''}. Renter accounts cannot create or manage property listings on Rentivo.
          </p>

          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '16px 20px',
            textAlign: 'left',
            marginBottom: '28px',
            fontSize: '13px',
            color: '#334155',
            lineHeight: 1.55
          }}>
            <strong style={{ color: '#000052', display: 'block', marginBottom: '4px' }}>
              Want to list property in Ibadan?
            </strong>
            To list apartments, flats, commercial spaces, or short-lets, you must create a dedicated Landlord or Property Lister account.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRegisterAsLister}
              style={{
                width: '100%',
                backgroundColor: '#000052',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 22px',
                fontSize: '14.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 82, 0.2)'
              }}
            >
              <span>Register as a Landlord / Lister</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleReturn}
              style={{
                width: '100%',
                backgroundColor: '#F1F5F9',
                color: '#000052',
                border: 'none',
                borderRadius: '12px',
                padding: '13px 22px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Return to Renter Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
