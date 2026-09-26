import React from 'react';
import { Search, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { FilterOptions, PropertyType, IBADAN_AREAS, PROPERTY_TYPES } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (updated: Partial<FilterOptions>) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
      {/* Top Search and Select Controls */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: '#fff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search keyword or area (e.g. Bodija, General Gas, UI)..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            style={{ 
              border: 'none', 
              outline: 'none', 
              width: '100%', 
              fontSize: '14px',
              fontFamily: 'inherit',
              color: 'var(--color-text)'
            }}
          />
        </div>

        {/* Location Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <select 
            value={filters.area || 'All Ibadan areas'}
            onChange={(e) => onFilterChange({ area: e.target.value })}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-navy)',
              outline: 'none'
            }}
          >
            {IBADAN_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <SlidersHorizontal size={15} className="text-muted" />
          <select 
            value={filters.sortBy || 'newest'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as FilterOptions['sortBy'] })}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-navy)',
              outline: 'none'
            }}
          >
            <option value="newest">Sort: Newest Listed</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Property Type Horizontal Pills */}
      <div className="cat-pill-row">
        {PROPERTY_TYPES.map(type => {
          const isActive = (filters.type || 'All Types') === type;
          return (
            <button
              key={type}
              className={`cat-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => onFilterChange({ type: type as PropertyType | 'All Types' })}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Quick Filter Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <button
          className={`chip-tag ${filters.verifiedOnly ? 'is-active' : ''}`}
          onClick={() => onFilterChange({ verifiedOnly: !filters.verifiedOnly })}
        >
          <ShieldCheck size={14} style={{ marginRight: '5px' }} />
          Verified Properties Only
        </button>

        <button
          className={`chip-tag ${filters.maxPrice === 1000000 ? 'is-active' : ''}`}
          onClick={() => onFilterChange({ maxPrice: filters.maxPrice === 1000000 ? undefined : 1000000 })}
        >
          Under ₦1,000,000 /yr
        </button>

        <button
          className={`chip-tag ${filters.bedrooms === 2 ? 'is-active' : ''}`}
          onClick={() => onFilterChange({ bedrooms: filters.bedrooms === 2 ? undefined : 2 })}
        >
          2+ Bedrooms
        </button>

        {(filters.verifiedOnly || filters.maxPrice || filters.bedrooms || filters.type !== 'All Types' || (filters.area && filters.area !== 'All Ibadan areas') || filters.searchQuery) && (
          <button
            onClick={() => onFilterChange({
              category: 'all',
              type: 'All Types',
              area: 'All Ibadan areas',
              minPrice: undefined,
              maxPrice: undefined,
              bedrooms: undefined,
              verifiedOnly: false,
              searchQuery: ''
            })}
            style={{
              fontSize: '12px',
              color: 'var(--color-danger)',
              fontWeight: 600,
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};
