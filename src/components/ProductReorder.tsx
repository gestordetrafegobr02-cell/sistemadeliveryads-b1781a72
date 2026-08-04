import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GripVertical, ArrowUpDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReorderProduct {
  id: string;
  name: string;
  category_id: string | null;
  image_url?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface ProductReorderProps {
  products: ReorderProduct[];
  categories: Category[];
  onReorder: () => void;
}

export function ProductReorder({ products, categories, onReorder }: ProductReorderProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [items, setItems] = useState<ReorderProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const buildItems = (catId: string) =>
    catId === 'all'
      ? [...products]
      : products.filter((p) => (p.category_id ?? 'none') === catId);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCategoryId('all');
      setItems([...products]);
    }
  };

  const selectCategory = (catId: string) => {
    setCategoryId(catId);
    setItems(buildItems(catId));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [moved] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, moved);
    setItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < items.length; i++) {
        const { error } = await supabase
          .from('products')
          .update({ sort_order: i })
          .eq('id', items[i].id);
        if (error) throw error;
      }
      toast.success('Ordem dos produtos salva!');
      onReorder();
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar ordem');
    } finally {
      setSaving(false);
    }
  };

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Sem categoria';

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Ordenar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Organizar Produtos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Arraste os produtos para definir a ordem de exibição no cardápio.
        </p>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => selectCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
              categoryId === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                categoryId === c.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="products">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 max-h-[420px] overflow-y-auto"
              >
                {items.map((product, index) => (
                  <Draggable key={product.id} draggableId={product.id} index={index}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          snapshot.isDragging
                            ? 'bg-primary/10 border-primary shadow-lg'
                            : 'bg-secondary border-border hover:border-primary/50'
                        }`}
                      >
                        <div
                          {...prov.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-9 h-9 rounded-md object-cover"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {catName(product.category_id)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                          {index + 1}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-primary text-primary-foreground"
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Ordem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
