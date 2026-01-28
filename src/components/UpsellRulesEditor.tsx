import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ArrowRight, Zap, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category_id: string | null;
}

interface UpsellRule {
  id: string;
  trigger_product_id: string;
  offer_product_id: string;
  custom_message: string | null;
  is_active: boolean;
  sort_order: number;
}

interface UpsellRulesEditorProps {
  storeId: string;
  products: Product[];
}

export function UpsellRulesEditor({ storeId, products }: UpsellRulesEditorProps) {
  const [rules, setRules] = useState<UpsellRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState('Que tal adicionar isso ao seu pedido?');
  
  // New rule form
  const [triggerProductId, setTriggerProductId] = useState('');
  const [offerProductId, setOfferProductId] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    fetchRulesAndSettings();
  }, [storeId]);

  async function fetchRulesAndSettings() {
    setLoading(true);
    try {
      const [rulesRes, storeRes] = await Promise.all([
        supabase
          .from('upsell_rules')
          .select('*')
          .eq('store_id', storeId)
          .order('sort_order'),
        supabase
          .from('stores')
          .select('upsell_default_message')
          .eq('id', storeId)
          .single()
      ]);

      if (rulesRes.error) throw rulesRes.error;
      setRules(rulesRes.data || []);
      
      if (storeRes.data?.upsell_default_message) {
        setDefaultMessage(storeRes.data.upsell_default_message);
      }
    } catch (err) {
      console.error('Error fetching upsell rules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRule() {
    if (!triggerProductId || !offerProductId) {
      toast.error('Selecione os produtos');
      return;
    }
    
    if (triggerProductId === offerProductId) {
      toast.error('O produto gatilho e a oferta devem ser diferentes');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('upsell_rules')
        .insert({
          store_id: storeId,
          trigger_product_id: triggerProductId,
          offer_product_id: offerProductId,
          custom_message: customMessage || null,
          sort_order: rules.length
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta regra já existe');
        } else {
          throw error;
        }
        return;
      }

      setRules([...rules, data]);
      setTriggerProductId('');
      setOfferProductId('');
      setCustomMessage('');
      toast.success('Regra de upsell criada!');
    } catch (err) {
      console.error('Error creating upsell rule:', err);
      toast.error('Erro ao criar regra');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(ruleId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('upsell_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r));
      toast.success(isActive ? 'Regra ativada!' : 'Regra desativada!');
    } catch (err) {
      console.error('Error toggling rule:', err);
      toast.error('Erro ao atualizar regra');
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      const { error } = await supabase
        .from('upsell_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.filter(r => r.id !== ruleId));
      toast.success('Regra removida!');
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast.error('Erro ao remover regra');
    }
  }

  async function handleSaveDefaultMessage() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ upsell_default_message: defaultMessage })
        .eq('id', storeId);

      if (error) throw error;
      toast.success('Mensagem padrão salva!');
    } catch (err) {
      console.error('Error saving default message:', err);
      toast.error('Erro ao salvar mensagem');
    } finally {
      setSaving(false);
    }
  }

  function getProductName(productId: string): string {
    return products.find(p => p.id === productId)?.name || 'Produto não encontrado';
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Regras de Oferta Personalizada</CardTitle>
        </div>
        <CardDescription>
          Crie ofertas específicas: quando o cliente pedir um produto, ofereça outro automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Message */}
        <div className="space-y-3 p-4 glass-card rounded-lg">
          <Label className="text-base font-medium">Mensagem Padrão do Upsell</Label>
          <p className="text-xs text-muted-foreground">
            Exibida quando não há mensagem personalizada para a oferta
          </p>
          <div className="flex gap-2">
            <Input
              value={defaultMessage}
              onChange={(e) => setDefaultMessage(e.target.value)}
              placeholder="Que tal adicionar isso ao seu pedido?"
              className="flex-1"
            />
            <Button 
              onClick={handleSaveDefaultMessage} 
              disabled={saving}
              size="sm"
            >
              Salvar
            </Button>
          </div>
        </div>

        {/* Add New Rule */}
        <div className="space-y-4 p-4 glass-card rounded-lg border-2 border-dashed border-primary/30">
          <Label className="text-base font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Regra de Oferta
          </Label>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Produto Gatilho</Label>
              <Select value={triggerProductId} onValueChange={setTriggerProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Se pedir..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="hidden md:flex items-center justify-center py-2">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Produto Ofertado</Label>
              <Select value={offerProductId} onValueChange={setOfferProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Oferece..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mensagem Personalizada (opcional)</Label>
            <Input
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ex: Que tal uma batata crocante para acompanhar?"
            />
          </div>
          
          <Button 
            onClick={handleAddRule} 
            disabled={saving || !triggerProductId || !offerProductId}
            className="w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Adicionar Regra
          </Button>
        </div>

        {/* Existing Rules */}
        {rules.length > 0 ? (
          <div className="space-y-3">
            <Label className="text-base font-medium">Regras Ativas ({rules.length})</Label>
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    rule.is_active ? 'glass-card' : 'bg-secondary/30 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium truncate">{getProductName(rule.trigger_product_id)}</span>
                      <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium truncate text-primary">{getProductName(rule.offer_product_id)}</span>
                    </div>
                    {rule.custom_message && (
                      <p className="text-xs text-muted-foreground mt-1 truncate italic">
                        "{rule.custom_message}"
                      </p>
                    )}
                  </div>
                  
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma regra personalizada criada</p>
            <p className="text-xs mt-1">O sistema usará sugestões automáticas de bebidas e sobremesas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

