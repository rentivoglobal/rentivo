import React from 'react';
import { Listing } from '../types';

interface PropertyThumbnailIllustrationProps {
  listing: Listing;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const PropertyThumbnailIllustration: React.FC<PropertyThumbnailIllustrationProps> = ({
  listing,
  width = '100%',
  height = '100%',
  className = '',
  style
}) => {
  const titleLower = (listing.title || '').toLowerCase();
  const typeLower = (listing.type || '').toLowerCase();

  // Determine illustration type
  const isShop = titleLower.includes('shop') || typeLower.includes('shop') || titleLower.includes('store') || titleLower.includes('retail');
  const isOffice = titleLower.includes('office') || typeLower.includes('office') || titleLower.includes('suite') || titleLower.includes('commercial');
  const isDuplex = titleLower.includes('duplex') || typeLower.includes('duplex') || titleLower.includes('bungalow') || titleLower.includes('villa');
  // Default is self-contain / apartment / house

  if (isShop) {
    // Shop Space: Light blue background, purple canopy awning, purple glass display doors
    return (
      <svg
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width, height, display: 'block', borderRadius: '12px', ...style }}
        className={className}
      >
        {/* Soft Sky Blue Canvas */}
        <rect width="120" height="90" rx="12" fill="#E0F2FE" />
        
        {/* Shop Foundation & Base Shadow */}
        <rect x="22" y="74" width="76" height="3" rx="1.5" fill="#BFDBFE" />

        {/* Shop Main Building */}
        <rect x="26" y="38" width="68" height="36" rx="2" fill="#FFFFFF" />

        {/* Upper Facade Header */}
        <rect x="24" y="36" width="72" height="7" rx="1" fill="#1E1B4B" />

        {/* Purple Awning / Canopy with scalloped pattern */}
        <path
          d="M22 43 H98 L94 51 H26 L22 43 Z"
          fill="#7E22CE"
        />
        {/* Awning Stripes / Ribs */}
        <line x1="34" y1="43" x2="33" y2="51" stroke="#9333EA" strokeWidth="2" />
        <line x1="46" y1="43" x2="45" y2="51" stroke="#9333EA" strokeWidth="2" />
        <line x1="58" y1="43" x2="57" y2="51" stroke="#9333EA" strokeWidth="2" />
        <line x1="70" y1="43" x2="69" y2="51" stroke="#9333EA" strokeWidth="2" />
        <line x1="82" y1="43" x2="81" y2="51" stroke="#9333EA" strokeWidth="2" />

        {/* Shop Glass Showcase Windows / Double Doors */}
        <rect x="33" y="55" width="23" height="19" rx="1.5" fill="#8B5CF6" />
        <rect x="35" y="57" width="19" height="15" rx="1" fill="#A78BFA" opacity="0.65" />
        {/* Glass reflection */}
        <path d="M37 68 L47 58 H43 L36 65 V68 H37 Z" fill="#FFFFFF" opacity="0.35" />

        <rect x="63" y="55" width="23" height="19" rx="1.5" fill="#8B5CF6" />
        <rect x="65" y="57" width="19" height="15" rx="1" fill="#A78BFA" opacity="0.65" />
        {/* Glass reflection */}
        <path d="M67 68 L77 58 H73 L66 65 V68 H67 Z" fill="#FFFFFF" opacity="0.35" />
      </svg>
    );
  }

  if (isOffice) {
    // Office Suite: Mint/pale cyan background, modern multi-story office building
    return (
      <svg
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width, height, display: 'block', borderRadius: '12px', ...style }}
        className={className}
      >
        {/* Soft Mint Canvas */}
        <rect width="120" height="90" rx="12" fill="#E6FFFA" />
        
        {/* Foundation shadow */}
        <rect x="30" y="75" width="60" height="3" rx="1.5" fill="#A7F3D0" />

        {/* Office Tower */}
        <rect x="36" y="22" width="48" height="53" rx="2" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Top Roof Rim / Parapet */}
        <rect x="34" y="20" width="52" height="4" rx="1" fill="#94A3B8" />

        {/* Window Grid (3 columns x 4 rows) */}
        {/* Row 1 */}
        <rect x="42" y="28" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="56" y="28" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="70" y="28" width="8" height="6" rx="1" fill="#CBD5E1" />

        {/* Row 2 */}
        <rect x="42" y="38" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="56" y="38" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="70" y="38" width="8" height="6" rx="1" fill="#CBD5E1" />

        {/* Row 3 */}
        <rect x="42" y="48" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="56" y="48" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="70" y="48" width="8" height="6" rx="1" fill="#CBD5E1" />

        {/* Row 4 */}
        <rect x="42" y="58" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="56" y="58" width="8" height="6" rx="1" fill="#CBD5E1" />
        <rect x="70" y="58" width="8" height="6" rx="1" fill="#CBD5E1" />

        {/* Entrance Door */}
        <rect x="54" y="66" width="12" height="9" rx="1" fill="#0B022B" />
      </svg>
    );
  }

  if (isDuplex) {
    // 3-Bedroom Duplex: Warm sand/peach background, 2-story duplex, brown flat roof, windows & door, sun
    return (
      <svg
        viewBox="0 0 120 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width, height, display: 'block', borderRadius: '12px', ...style }}
        className={className}
      >
        {/* Warm Sand / Peach Canvas */}
        <rect width="120" height="90" rx="12" fill="#FEF3C7" />
        
        {/* Soft Sun on Left */}
        <circle cx="24" cy="22" r="6" fill="#F59E0B" />

        {/* Ground Line */}
        <rect x="18" y="74" width="84" height="3" rx="1.5" fill="#FDE68A" />

        {/* Duplex 2-Story Building */}
        <rect x="25" y="36" width="70" height="38" rx="2" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1" />

        {/* Parapet / Brown Flat Roof */}
        <rect x="23" y="33" width="74" height="4.5" rx="1" fill="#9A3412" />

        {/* Middle floor dividing trim */}
        <rect x="25" y="52" width="70" height="2" fill="#D97706" opacity="0.4" />

        {/* 2nd Floor Windows */}
        <rect x="33" y="40" width="12" height="8" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="54" y="40" width="12" height="8" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="75" y="40" width="12" height="8" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />

        {/* 1st Floor Windows & Navy Door */}
        <rect x="33" y="57" width="12" height="9" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="55" y="57" width="10" height="17" rx="1" fill="#0B022B" />
        <rect x="75" y="57" width="12" height="9" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
      </svg>
    );
  }

  // 2-Bedroom Self-Contain (Default / House):
  // Lavender background, purple roof, sun, tree, windows & door
  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width, height, display: 'block', borderRadius: '12px', ...style }}
      className={className}
    >
      {/* Soft Pastel Lavender Canvas */}
      <rect width="120" height="90" rx="12" fill="#EDE9FE" />

      {/* Warm Yellow Sun in Top Right */}
      <circle cx="95" cy="22" r="6.5" fill="#FACC15" />

      {/* Ground Line / Base Shadow */}
      <rect x="18" y="73" width="84" height="3" rx="1.5" fill="#DDD6FE" />

      {/* Tree on Left */}
      <rect x="24" y="62" width="2.5" height="11" rx="1" fill="#818CF8" />
      <circle cx="25.2" cy="57" r="6.5" fill="#C4B5FD" />

      {/* House Base Walls */}
      <rect x="38" y="48" width="54" height="25" rx="1" fill="#FFFFFF" />

      {/* Symmetrical Gable Roof in Deep Purple */}
      <path
        d="M34 49 L65 34 L96 49 Z"
        fill="#3730A3"
      />

      {/* Central Navy Door */}
      <rect x="60" y="56" width="10" height="17" rx="1" fill="#0B022B" />

      {/* Left Window */}
      <rect x="44" y="54" width="9" height="9" rx="1" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="0.8" />
      <line x1="48.5" y1="54" x2="48.5" y2="63" stroke="#C7D2FE" strokeWidth="0.6" />
      <line x1="44" y1="58.5" x2="53" y2="58.5" stroke="#C7D2FE" strokeWidth="0.6" />

      {/* Right Window */}
      <rect x="77" y="54" width="9" height="9" rx="1" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="0.8" />
      <line x1="81.5" y1="54" x2="81.5" y2="63" stroke="#C7D2FE" strokeWidth="0.6" />
      <line x1="77" y1="58.5" x2="86" y2="58.5" stroke="#C7D2FE" strokeWidth="0.6" />
    </svg>
  );
};
