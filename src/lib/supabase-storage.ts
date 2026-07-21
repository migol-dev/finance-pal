import { supabase } from './supabase';

const STORAGE_BUCKET = 'receipts';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function generateSecurePath(userId: string, receiptId: string, mime: string): string {
  const ext = mime.split('/')[1] || 'png';
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const baseName = `receipt-${receiptId}-${timestamp}-${random}.${ext}`;
  
  // Use a simpler but secure path with random component
  // The random UUID part makes enumeration infeasible
  return `${userId}/${baseName}`;
}

async function validateAndCompressImage(dataUrl: string): Promise<{ blob: Blob; mime: string } | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
    if (!m) return null;
    
    const mime = m[1];
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      console.error('Invalid MIME type:', mime);
      return null;
    }
    
    const base64 = m[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    if (bytes.length > MAX_FILE_SIZE) {
      console.error('File too large:', bytes.length);
      return null;
    }
    
    // Basic magic bytes validation
    const magicBytes = bytes.slice(0, 12);
    if (mime === 'image/jpeg' && !(magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF)) {
      console.error('Invalid JPEG magic bytes');
      return null;
    }
    if (mime === 'image/png' && !(magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47)) {
      console.error('Invalid PNG magic bytes');
      return null;
    }
    if (mime === 'image/webp' && !(magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50)) {
      console.error('Invalid WebP magic bytes');
      return null;
    }
    
    // Compress if over 1MB
    if (bytes.length > 1024 * 1024 && typeof document !== 'undefined') {
      const compressed = await compressImage(dataUrl, mime);
      if (compressed) return compressed;
    }
    
    return { blob: new Blob([bytes], { type: mime }), mime };
  } catch (e) {
    console.error('Image validation failed:', e);
    return null;
  }
}

async function compressImage(dataUrl: string, _mime: string): Promise<{ blob: Blob; mime: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      
      // Max dimension 1920px
      const maxDim = 1920;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => resolve(blob ? { blob, mime: 'image/webp' } : null),
        'image/webp',
        0.8
      );
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function uploadReceipt(userId: string, receiptId: string, dataUrl: string): Promise<string | null> {
  try {
    const validated = await validateAndCompressImage(dataUrl);
    if (!validated) return null;
    
    const path = generateSecurePath(userId, receiptId, validated.mime);
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, validated.blob, {
        contentType: validated.mime,
        upsert: false,
      });
    
    if (error) {
      console.error('Supabase Storage upload error:', sanitizeForLog(error));
      return null;
    }
    
    // Generate signed URL instead of public URL for better security
    const { data, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
    
    if (urlError || !data?.signedUrl) {
      console.error('Failed to create signed URL:', sanitizeForLog(urlError));
      return null;
    }
    
    return data.signedUrl;
  } catch (e) {
    console.error('Upload receipt error:', sanitizeForLog(e));
    return null;
  }
}

export async function deleteReceipt(userId: string, signedUrl: string): Promise<boolean> {
  try {
    const url = new URL(signedUrl);
    const pathParts = url.pathname.split(`/${STORAGE_BUCKET}/`);
    if (pathParts.length < 2) return false;
    const path = pathParts[1].split('?')[0]; // Remove query params
    
    // Verify the path belongs to this user
    if (!path.startsWith(`${userId}/`)) {
      console.error('Attempted to delete receipt from another user');
      return false;
    }
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    
    if (error) {
      console.error('Supabase Storage delete error:', sanitizeForLog(error));
      return false;
    }
    return true;
  } catch (e) {
    console.error('Delete receipt error:', sanitizeForLog(e));
    return false;
  }
}

export async function getReceiptSignedUrl(userId: string, path: string): Promise<string | null> {
  try {
    // Verify ownership
    if (!path.startsWith(`${userId}/`)) return null;
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
    
    if (error || !data?.signedUrl) {
      console.error('Failed to get signed URL:', sanitizeForLog(error));
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error('Get signed URL error:', sanitizeForLog(e));
    return null;
  }
}

function sanitizeForLog(data: unknown): string {
  try {
    const str = JSON.stringify(data);
    if (str.length > 200) return str.slice(0, 200) + '... [truncated]';
    return str;
  } catch {
    return '[unserializable]';
  }
}