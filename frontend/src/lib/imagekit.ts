import { imagekitPublicKey, isLiveBackend } from './config';
import { supabase } from './supabase';

export interface UploadedPhoto {
  url: string;
  fileId: string;
  filePath: string;
  thumbnailUrl: string;
}

export async function getImageKitAuth(): Promise<{ signature: string; token: string; expire: number }> {
  if (!isLiveBackend || !supabase) {
    throw new Error('ImageKit authentication requires a configured Supabase project.');
  }
  const { data, error } = await supabase.functions.invoke('imagekit-auth');
  if (error) throw error;
  return data as { signature: string; token: string; expire: number };
}

export async function uploadToImageKit(file: File, folder = '/rentivo/listings'): Promise<UploadedPhoto> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Each photo must be 8MB or smaller.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed.');
  }

  if (!imagekitPublicKey) {
    const url = URL.createObjectURL(file);
    return { url, fileId: `local-${file.name}-${Date.now()}`, filePath: file.name, thumbnailUrl: url };
  }

  const auth = await getImageKitAuth();
  const body = new FormData();
  body.append('file', file);
  body.append('fileName', file.name);
  body.append('publicKey', imagekitPublicKey);
  body.append('signature', auth.signature);
  body.append('expire', String(auth.expire));
  body.append('token', auth.token);
  body.append('folder', folder);
  body.append('useUniqueFileName', 'true');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body
  });
  if (!response.ok) {
    throw new Error('Photo upload failed. Please try again.');
  }
  const json = await response.json();
  return {
    url: json.url,
    fileId: json.fileId,
    filePath: json.filePath,
    thumbnailUrl: json.thumbnailUrl || json.url
  };
}
