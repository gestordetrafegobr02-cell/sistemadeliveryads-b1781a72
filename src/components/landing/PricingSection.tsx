import { Check, ArrowRight, Shield, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';

interface PricingSectionProps {
  onCtaClick: () => void;
}

export function PricingSection({ onCtaClick }: PricingSectionProps) {
  const { settings, loading } = useGlobalSettings();
  
  const benefits = [
    'Sem fidelidade - cancele quando quiser',
    'ZERO comissão por pedido',
    'Suporte via WhatsApp',
    'Upsell inteligente incluso',
    'Recuperação de carrinhos',
    'Relatórios completos',
  ];

  const guarantees = [
    { icon: Shield, text: 'Não pedimos cartão de crédito' },
    { icon: CreditCard, text: 'Sem cobrança automática' },
  ];

  return (
    <section className="py-20 md:py-24 pb-32 md:pb-40 px-4 md:px-6 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Plano Profissional
          </h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-2xl mx-auto px-2">
            Tudo o que você precisa para vender mais e fidelizar seus clientes.
          </p>
        </div>

        <div className="relative max-w-lg mx-auto px-4 sm:px-0">
          {/* Pricing Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-baseline justify-center gap-1 sm:gap-2">
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                ) : (
                  <>
                    <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900">R$ {Math.floor(settings.subscription_price)}</span>
                    <span className="text-lg sm:text-xl text-neutral-500">/mês</span>
                  </>
                )}
              </div>
              <p className="text-neutral-500 mt-2 text-sm">
                Mensal • Sem taxas por venda
              </p>
              <p className="text-neutral-400 text-sm mt-1">
                Teste grátis por {settings.default_trial_days} dias • Sem compromisso
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  </div>
                  <span className="text-neutral-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Guarantees */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {guarantees.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-50 rounded-xl px-4 py-2 flex-1 justify-center">
                  <item.icon className="w-4 h-4" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button 
              size="lg"
              onClick={onCtaClick}
              className="w-full h-14 text-lg bg-neutral-900 hover:bg-neutral-800 text-white gap-2 shadow-lg"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-xs text-neutral-400 text-center mt-4">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
