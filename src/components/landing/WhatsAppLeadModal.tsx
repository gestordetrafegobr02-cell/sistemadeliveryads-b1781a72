import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { trackLandingEvent } from '@/lib/landingPixel';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SEGMENTS = ['Hamburgueria', 'Pizzaria', 'Açaiteria', 'Hortifruti', 'Restaurante', 'Outro'];
const HAS_MENU = ['Sim, tenho tudo pronto', 'Tenho parcial (fotos ou lista)', 'Não tenho, quero ajuda'];
const URGENCY = ['Hoje mesmo', 'Nos próximos dias', 'Estou pesquisando'];

export function WhatsAppLeadModal({ open, onOpenChange }: Props) {
  const { settings } = useGlobalSettings();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '', whatsapp: '', segment: '', hasMenu: '', productCount: '', urgency: '', notes: '',
  });

  const set = (k: keyof typeof data, v: string) => setData(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return data.name.trim().length > 1 && data.whatsapp.replace(/\D/g, '').length >= 10;
    if (step === 1) return !!data.segment;
    if (step === 2) return !!data.hasMenu && !!data.productCount;
    if (step === 3) return !!data.urgency;
    return true;
  };

  const buildMessage = () => {
    return [
      `Olá! Quero criar meu cardápio digital na DeliveryPro 🚀`,
      ``,
      `👤 *Nome:* ${data.name}`,
      `📱 *WhatsApp:* ${data.whatsapp}`,
      `🏪 *Segmento:* ${data.segment}`,
      `📋 *Cardápio pronto?* ${data.hasMenu}`,
      `📦 *Qtd. de produtos:* ${data.productCount}`,
      `⏱️ *Quando quero começar:* ${data.urgency}`,
      data.notes.trim() ? `📝 *Observações:* ${data.notes.trim()}` : '',
      ``,
      `Aguardo o link para enviar minhas fotos e informações. Obrigado!`,
    ].filter(Boolean).join('\n');
  };

  const handleSend = () => {
    trackLandingEvent('Lead', { content_name: 'whatsapp_lead_form', segment: data.segment });
    const phone = ((settings as any).support_whatsapp || '5511999999999').replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setStep(4);
  };

  const reset = () => { setStep(0); setData({ name: '', whatsapp: '', segment: '', hasMenu: '', productCount: '', urgency: '', notes: '' }); };
  const handleClose = (v: boolean) => { onOpenChange(v); if (!v) setTimeout(reset, 300); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/30">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {step === 4 ? 'Pedido enviado!' : 'Vamos montar seu cardápio'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 4 ? 'Abrimos o WhatsApp com sua solicitação pré-preenchida.' : 'Responda 4 perguntas rápidas — enviamos direto no WhatsApp.'}
          </DialogDescription>
        </DialogHeader>

        {step < 4 && (
          <div className="flex gap-1.5 mb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div><Label>Seu nome</Label><Input value={data.name} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva" className="h-12 rounded-xl mt-1.5" /></div>
            <div><Label>WhatsApp (com DDD)</Label><Input value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" className="h-12 rounded-xl mt-1.5" /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label>Qual seu segmento?</Label>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENTS.map(s => (
                <button key={s} type="button" onClick={() => set('segment', s)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${data.segment === s ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Você já tem seu cardápio pronto?</Label>
              <div className="space-y-2 mt-2">
                {HAS_MENU.map(o => (
                  <button key={o} type="button" onClick={() => set('hasMenu', o)}
                    className={`w-full p-3 rounded-xl border-2 text-sm text-left transition-all ${data.hasMenu === o ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Quantos produtos aproximadamente?</Label>
              <Input value={data.productCount} onChange={e => set('productCount', e.target.value)} placeholder="Ex: 20, 50, 100+" className="h-12 rounded-xl mt-1.5" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Quando quer começar a vender?</Label>
              <div className="space-y-2 mt-2">
                {URGENCY.map(o => (
                  <button key={o} type="button" onClick={() => set('urgency', o)}
                    className={`w-full p-3 rounded-xl border-2 text-sm text-left transition-all ${data.urgency === o ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Alguma observação? (opcional)</Label>
              <Textarea value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex: quero cores da minha marca, tenho logo pronta..." className="rounded-xl mt-1.5" rows={3} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-foreground/70 mb-6">Se o WhatsApp não abriu, clique no botão abaixo.</p>
            <Button onClick={handleSend} className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              <MessageCircle className="w-5 h-5" /> Abrir WhatsApp novamente
            </Button>
          </div>
        )}

        {step < 4 && (
          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="h-12 rounded-xl gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white gap-1">
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!canNext()} className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                <MessageCircle className="w-5 h-5" /> Enviar no WhatsApp
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
