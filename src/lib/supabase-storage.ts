import { supabase } from './supabase';

export async function uploadReceipt(userId: string, receiptId: string, dataUrl: string): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
    const base64 = m ? m[2] : dataUrl.split(",")[1];
    const mime = m ? m[1] : "image/png";
    const ext = mime.split("/")[1] || "png";
    const fileName = `receipt-${receiptId}-${Date.now()}.${ext}`;
    const path = `${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(path, Uint8Array.from(atob(base64), c => c.charCodeAt(0)), {
        contentType: mime,
        upsert: false,
      });
    
    if (error) {
      console.error('Supabase Storage upload error:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(path);
    
    return publicUrl;
  } catch (e) {
    console.error('Upload receipt error:', e);
    return null;
  }
}

export async function deleteReceipt(userId: string, publicUrl: string): Promise<boolean> {
  try {
    // Extract path from public URL
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/receipts/');
    if (pathParts.length < 2) return false;
    const path = pathParts[1];
    
    const { error } = await supabase.storage
      .from('receipts')
      .remove([path]);
    
    if (error) {
      console.error('Supabase Storage delete error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Delete receipt error:', e);
    return false;
  }
}