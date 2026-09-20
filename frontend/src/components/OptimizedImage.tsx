import React from 'react';
import { imagekitUrlEndpoint } from '../lib/config';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lqip?: boolean;
}

export function transformImageKit(src: string, width?: number, height?: number, extra = 'q-80,f-auto'): string {
  if (!src) return src;
  const isImageKit = src.includes('ik.imagekit.io') || (imagekitUrlEndpoint && src.startsWith(imagekitUrlEndpoint));
  if (!isImageKit) return src;
  const tr = [width ? `w-${width}` : '', height ? `h-${height}` : '', 'fo-auto', extra].filter(Boolean).join(',');
  return src.includes('?') ? `${src}&tr=${tr}` : `${src}?tr=${tr}`;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 500,
  height = 350,
  lqip = true,
  style,
  ...rest
}) => {
  const full = transformImageKit(src, width, height);
  const placeholder = lqip ? transformImageKit(src, 40, 28, 'bl-6,q-20,f-auto') : undefined;

  return (
    <img
      src={full}
      alt={alt}
      loading="lazy"
      style={{
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: 'cover',
        ...style
      }}
      {...rest}
    />
  );
};
