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
  const [uploading, setU...[truncated]