import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GripVertical, ArrowUpDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface CategoryReorderProps {
  categories: Category[];
  onReorder: () => void;
}

export function CategoryReorder({ categories, onReorder }: CategoryReorderProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setItems([...categories].sort((a, b) => a.sort_order - b.sort_order));
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = items.map((item, index) => ({
        id: item.id,
        name: item.name,
        sort_order: index,
        store_id: undefined as string | undefined,
      }));

      // Update each category's sort_order
      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Ordem das categorias salva!');
      onReorder();
      setOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar ordem');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Ordenar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Organizar Categorias</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste as categorias para definir a ordem de exibição no cardápio.
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 max-h-[400px] overflow-y-auto"
              >
                {items.map((category, index) => (
                  <Draggable key={category.id} draggableId={category.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          snapshot.isDragging
                            ? 'bg-primary/10 border-primary shadow-lg'
                            : 'bg-secondary border-border hover:border-primary/50'
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <span className="flex-1 font-medium">{category.name}</span>
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

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={saving}
          >
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
