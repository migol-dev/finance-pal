-- Hardening del bucket privado de comprobantes (receipts):
-- Mantiene el bucket privado con RLS por carpeta ({user_id}/*),
-- limita el tamaño máximo por objeto a 5 MB y restringe MIME types a imágenes rasterizadas seguras.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']
WHERE id = 'receipts';
