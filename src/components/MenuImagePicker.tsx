import { useMenuImageBank } from '@/hooks/useMenuImageBank';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuImagePickerProps {
  value: string;
  onSelect: (url: string) => void;
}

export function MenuImagePicker({ value, onSelect }: MenuImagePickerProps) {
  const { categories, loading } = useMenuImageBank();

  return (
    <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Banco de imagens (clique para usar)</p>
        <p className="text-xs text-muted-foreground">
          Imagens prontas em alta resolução — sem upload necessário.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando imagens...
        </div>
      )}

      {categories.map((category) => (
        <div key={category.id} className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {category.label} <span className="text-muted-foreground/60">({category.items.length})</span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {category.items.map((item) => {
              const active = value === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-md border-2 transition-all',
                    active
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-transparent hover:border-primary/60'
                  )}
                  title={item.name}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                      <Check className="h-6 w-6 text-primary-foreground drop-shadow" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
