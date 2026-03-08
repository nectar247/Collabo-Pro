import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

/**
 * Upload a base64-encoded image to Firebase Storage and return its public download URL.
 * @param base64  Raw base64 string (no data:// prefix)
 * @param path    Storage path, e.g. "documents/doc123/images/img456.jpg"
 */
export async function uploadImageBase64(base64: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64, 'base64');
  return getDownloadURL(storageRef);
}

/** Pick a file extension from a mime type string. Falls back to 'jpg'. */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/gif':  'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return map[mime] ?? 'jpg';
}
