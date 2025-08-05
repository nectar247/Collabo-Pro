/**
 * Image optimization utilities for Firebase Storage and external images
 */

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
}

/**
 * Optimizes Firebase Storage image URLs with proper sizing and compression
 */
export function optimizeFirebaseImage(
  url: string, 
  options: ImageOptimizationOptions = {}
): string {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  const { width, height, quality = 80, format = 'webp' } = options;
  
  try {
    const urlObj = new URL(url);
    
    // Add compression parameters for Firebase Storage
    if (width) urlObj.searchParams.set('w', width.toString());
    if (height) urlObj.searchParams.set('h', height.toString());
    if (quality && quality !== 100) urlObj.searchParams.set('q', quality.toString());
    if (format !== 'auto') urlObj.searchParams.set('f', format);
    
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to optimize Firebase image URL:', error);
    return url;
  }
}

/**
 * Generate responsive image sizes for different breakpoints
 */
export function getResponsiveSizes(baseSize: number): string {
  return [
    `(max-width: 640px) ${Math.min(baseSize, 320)}px`,
    `(max-width: 768px) ${Math.min(baseSize, 400)}px`, 
    `(max-width: 1024px) ${Math.min(baseSize, 500)}px`,
    `${baseSize}px`
  ].join(', ');
}

/**
 * Common image optimization presets
 */
export const IMAGE_PRESETS = {
  brandCard: {
    banner: { width: 400, height: 160, quality: 85, format: 'webp' as const },
    logo: { width: 64, height: 64, quality: 90, format: 'webp' as const }
  },
  dealCard: {
    thumbnail: { width: 80, height: 80, quality: 85, format: 'webp' as const }
  },
  hero: {
    background: { width: 1200, height: 600, quality: 80, format: 'webp' as const }
  }
} as const;