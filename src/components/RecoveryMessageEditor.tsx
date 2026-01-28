import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Lightbulb, Gift, Percent } from 'lucide-react';

interface RecoveryMessageEditorProps {
  storeId: string;
  storeName: string;
}

const DEFAULT_MESSAGE = 'Olá {cliente}, notamos que você deixou um {pedido} no carrinho na {loja}. Quer finalizar seu pedido agora?';

const STRATEGY_TEMPLATES = [
  {
    name: 'Apenas Lembrete',
    icon: MessageSquare,
    message: 'Oi {cliente}, seu {pedido} ainda está quente esperando por você na {loja}!',
  },
  {
    name: 'Brinde',
    icon: Gift,
    message: 'Oi {cliente}, finalize seu {pedido} na {loja} agora e ganhe uma batata frita média de brinde!',
  },
  {
    name: 'Desconto',
    icon: Percent,
    message: 'Olá {cliente}! Use o cupom VOLTA5 e ganhe desconto no seu {pedido} na {loja}.',
  },
];

export function RecoveryMessageEditor({ storeId, storeName }: RecoveryMessageEditorProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplate() {
      const { data } = await supabase
        .from('stores')
        .select('recovery_message_template')
        .eq('id', storeId)
        .single();
      
      if (data?.recovery_message_template) {
        setMessage(data.recovery_message_template);
      }
      setLoading(false);
    }
    
    fetchTemplate();
  }, [storeId]);

  async function handleSave() {
    if (!message.trim()) {
      toast.error('A mensagem não pode estar vazia');
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from('stores')
      .update({ recovery_message_template: message.trim() })
      .eq('id', storeId);

    if (error) {
      toast.error('Erro ao salvar mensagem');
    } else {
      toast.success('Mensagem de recuperação salva!');
    }
    
    setSaving(false);
  }

  function applyTemplate(template: string) {
    setMessage(template);
  }

  // Preview with sample data
  const previewMessage = message
    .replace('{cliente}', 'João')
    .replace('{loja}', storeName || 'Sua Loja')
    .replace('{pedido}', '1x X-Bacon, 1x Coca-Cola');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Mensagem de Recuperação Automática
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Input */}
        <div className="space-y-2">
          <Label>Personalize sua mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={DEFAULT_MESSAGE}
            className="bg-secondary border-border min-h-[120px]"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Use as variáveis: <code className="bg-secondary px-1 py-0.5 rounded">{'{cliente}'}</code> para o nome do cliente, 
            <code className="bg-secondary px-1 py-0.5 rounded ml-1">{'{loja}'}</code> para o nome da loja, e 
            <code className="bg-secondary px-1 py-0.5 rounded ml-1">{'{pedido}'}</code> para os itens do carrinho.
          </p>
        </div>

        {/* Strategy Templates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <Label className="text-sm">Dicas de Estratégia</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STRATEGY_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                className="gap-2 justify-start h-auto py-2 px-3 text-left"
                onClick={() => applyTemplate(template.message)}
              >
                <template.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{template.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 glass-card rounded-lg space-y-2">
          <Label className="text-sm text-muted-foreground">Pré-visualização:</Label>
          <p className="text-sm text-foreground whitespace-pre-wrap">{previewMessage}</p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-glow bg-primary text-primary-foreground"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
