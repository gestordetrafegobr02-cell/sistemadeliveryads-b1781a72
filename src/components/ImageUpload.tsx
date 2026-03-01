import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image as ImageIcon, Images } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorMapper';
import { StockImageGallery } from './StockImageGallery';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  storeId: string;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, folder, storeId, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const fileName = `${storeId}/${folder}/${uniqueId}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file, {
          cacheControl: '0',
          upsert: false,
        });

      if (uploadError) {
        toast.error(getErrorMessage(uploadError));
        return;
      }

      if (!uploadData?.path) {
        toast.error('Erro: arquivo não foi salvo corretamente.');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

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

        {/* Upload + Gallery Buttons */}
        <div className="flex gap-2 flex-wrap">
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
            {uploading ? 'Enviando...' : 'Enviar Foto'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setGalleryOpen(true)}
            className="gap-2"
          >
            <Images className="w-4 h-4" />
            Escolher da Galeria
          </Button>
        </div>
      </div>

      <StockImageGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => {
          onChange(url);
          toast.success('Imagem da galeria selecionada!');
        }}
      />
    </div>
  );
}
