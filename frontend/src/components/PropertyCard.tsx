import React from 'react';
import { ShieldCheck, Heart, MapPin, Bed, Bath, Maximize2 } from 'lucide-react';
import { Listing } from '../types';
import { formatNaira, formatPeriod } from '../utils/formatters';

interface PropertyCardProps {
  listing: Listing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (listing: Listing) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  listing,
  isFavorite,
  onToggleFavorite,
  onSelect
}) => {
  return (
    <article className="rentivo-card" onClick={() => onSelect(listing)} style={{ cursor: 'pointer' }}>
      {/* Photo Container */}
      <div className="rentivo-card__image-wrap">
        <img 
          src={listing.photos[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'} 
          alt={listing.title} 
          className="rentivo-card__image"
          loading="lazy"
        />

        {/* Verified Ribbon */}
        {listing.verificationStatus === 'verified' && (
          <div className="rentivo-card__verified-badge">
            <span className="badge badge-verified">
              <ShieldCheck size={13} />
              <span>Verified</span>
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button 
          className={`rentivo-card__fav-btn ${isFavorite ? 'is-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(listing.id);
          }}
          aria-label={isFavorite ? "Remove from saved" : "Save property"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Card Details */}
      <div className="rentivo-card__body">
        <div className="rentivo-card__tags">
          <span className="badge-type">{listing.type}</span>
          <span className="badge-available">
            {listing.isAvailable ? 'Available' : 'Under Review'}
          </span>
        </div>

        <h3 className="rentivo-card__title" title={listing.title}>
          {listing.title}
        </h3>

        <div className="rentivo-card__location">
          <MapPin size={13} className="text-muted" />
          <span>{listing.area}, Ibadan</span>
        </div>

        {/* Specs: Bed, Bath, Size */}
        <div className="rentivo-card__specs">
          {listing.bedrooms !== undefined && listing.bedrooms > 0 && (
            <div className="rentivo-card__spec-item">
              <Bed size={14} />
              <span>{listing.bedrooms} bed</span>
            </div>
          )}
          {listing.bathrooms !== undefined && listing.bathrooms > 0 && (
            <div className="rentivo-card__spec-item">
              <Bath size={14} />
              <span>{listing.bathrooms} bath</span>
            </div>
          )}
          {listing.areaSqm !== undefined && (
            <div className="rentivo-card__spec-item">
              <Maximize2 size={13} />
              <span>{listing.areaSqm} sqm</span>
            </div>
          )}
        </div>

        {/* Pricing Footer */}
        <div className="rentivo-card__footer">
          <div className="rentivo-card__price">
            {formatNaira(listing.price)}
            <span className="rentivo-card__price-period">
              {formatPeriod(listing.pricePeriod)}
            </span>
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(listing);
            }}
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
};
