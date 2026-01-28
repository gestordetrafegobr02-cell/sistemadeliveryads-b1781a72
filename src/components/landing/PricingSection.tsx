import { Check, ArrowRight, Shield, CreditCard, Sparkles, Loader2 } from 'lucide-react';
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
    <section className="py-20 md:py-24 px-4 md:px-6 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Acesso Completo Liberado
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Plano Profissional Liberado
          </h2>
          <p className="text-neutral-500 text-base md:text-lg max-w-2xl mx-auto px-2">
            Teste por {settings.default_trial_days} dias sem compromisso. Se gostar, assine por apenas{' '}
            {loading ? (
              <Loader2 className="inline w-4 h-4 animate-spin" />
            ) : (
              <strong className="text-neutral-800">R$ {settings.subscription_price}/mês</strong>
            )}
            .
          </p>
        </div>

        <div className="relative max-w-lg mx-auto px-4 sm:px-0">
          {/* Pricing Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-primary/30 p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
            
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-bold shadow-lg">
                🎁 {settings.default_trial_days} DIAS GRÁTIS
              </span>
            </div>

            <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-6 relative">
              <p className="text-sm text-neutral-500 mb-2">Após o teste, apenas</p>
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
              <p className="text-green-600 font-medium mt-2 text-sm sm:text-base">
                ZERO taxa por pedido • Lucro 100% seu
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
              className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20"
            >
              Começar Meu Teste Grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-xs text-neutral-400 text-center mt-4">
              Sem cartão de crédito • Sem cobrança automática • Cancele quando quiser
            </p>
          </div>

          {/* Trust box below */}
          <div className="mt-8 p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
            <p className="text-green-800 font-medium">
              💡 Após os {settings.default_trial_days} dias, seu painel será apenas pausado.<br />
              <span className="text-green-600 font-normal">Você só paga se o sistema realmente trouxer resultados.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
