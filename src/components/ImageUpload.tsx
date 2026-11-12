import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorMapper';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  storeId: string;
  label?: string;
  className?: string;
}

async function prepareImageForUpload(file: File): Promise<File> {
  // Keep animated GIFs unchanged and avoid unnecessary work for already-small WebP files.
  if (file.type === 'image/gif' || file.type === 'image/webp' || typeof createImageBitmap === 'undefined') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    // Upload the original if the browser cannot decode or encode the image.
    return file;
  }
}

export function ImageUpload({ value, onChange, folder, storeId, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);

    try {
      // Resize/re-encode large photos in the browser before sending them to Storage.
      // Unique filenames allow long-lived CDN/browser caching without stale replacements.
      const uploadFile = await prepareImageForUpload(file);
      const fileExt = uploadFile.name.split('.').pop();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const fileName = `${storeId}/${folder}/${uniqueId}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('store-assets')
        .upload(fileName, uploadFile, {
          cacheControl: '31536000', // Unique object names are safe to cache for one year
          upsert: false,
        });

      if (uploadError) {
        toast.error(getErrorMessage(uploadError));
        return;
      }

      // Verify upload was successful by checking if file exists
      if (!uploadData?.path) {
        toast.error('Erro: arquivo não foi salvo corretamente.');
        return;
      }

      // Get public URL with cache-busting query parameter
      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      // Append cache-busting timestamp to URL to force browser refresh
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      onChange(cacheBustedUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemove() {
    // Just clear the URL - we could also delete from storage but keeping for simplicity
    onChange('');
    toast.success('Imagem removida');
  }

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      
      <div className="space-y-3">
        {/* Image Preview */}
        {value ? (
          <div className="relative inline-block">
            <img
              src={value}
              alt="Preview"
              className="w-24 h-24 rounded-lg object-cover border-2 border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6"
              onClick={handleRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/50">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* Upload Button */}
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Enviando...' : 'Enviar Imagem'}
          </Button>
        </div>
      </div>
    </div>
  );
}
