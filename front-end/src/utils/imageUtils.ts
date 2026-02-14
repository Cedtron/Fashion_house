import { API_URL } from './environment';

/**
 * Helper function to construct proper image URLs
 * @param imagePath - The image path from the backend (S3 URL or local path)
 * @returns Complete image URL or null if no path provided
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) {
    return null;
  }
  
  // If it's already a full S3 URL, return as is
  if (imagePath.startsWith('https://') && imagePath.includes('amazonaws.com')) {
    console.log('✅ S3 URL detected:', imagePath);
    return imagePath;
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Legacy support: construct URL for old local paths
  const cleanApiUrl = API_URL.replace(/\/+$/, '');
  let cleanImagePath = imagePath.trim();
  if (!cleanImagePath.startsWith('/')) {
    cleanImagePath = `/${cleanImagePath}`;
  }
  
  const fullUrl = `${cleanApiUrl}${cleanImagePath}`;
  console.log('⚠️ Legacy local path detected, constructing URL:', fullUrl);
  
  return fullUrl;
}

/**
 * Helper function to handle image loading errors
 * @param event - The error event from img onError
 * @param fallbackElement - Optional fallback element to show (like initials)
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>, fallbackElement?: HTMLElement | null) {
  const img = event.currentTarget;
  console.error('Failed to load image:', img.src);
  
  // Hide the image
  img.style.display = 'none';
  
  // Show fallback if provided
  if (fallbackElement) {
    fallbackElement.classList.remove('hidden');
  }
}