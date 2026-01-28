import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingSectionProps {
  onCtaClick: () => void;
}

export function PricingSection({ onCtaClick }: PricingSectionProps) {
  const benefits = [
    'Sem fidelidade',
    'Sem comissão por pedido',
    'Suporte via WhatsApp',
    'Upsell inteligente',
    'Recuperação de carrinhos',
    'Relatórios completos',
  ];

  return (
    <section className="py-24 px-4 md:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
            Preço único e transparente
          </h2>
          <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
            Após os 7 dias de teste, você paga apenas um valor fixo. Sem surpresas.
          </p>
        </div>

        <div className="relative max-w-lg mx-auto">
          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-neutral-50 to-white rounded-3xl border-2 border-primary/20 p-8 md:p-10 shadow-xl">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-lg">
                Plano Único
              </span>
            </div>

            <div className="text-center mb-8 pt-4">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl md:text-6xl font-bold text-neutral-900">R$ 97</span>
                <span className="text-xl text-neutral-500">/mês</span>
              </div>
              <p className="text-neutral-500 mt-2">
                Após os 7 dias de teste grátis
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-neutral-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button 
              size="lg"
              onClick={onCtaClick}
              className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white gap-2"
            >
              Começar Teste Grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-xs text-neutral-400 text-center mt-3">
              Teste por 7 dias. Depois, apenas R$ 97/mês. Cancele quando quiser.
            </p>
          </div>

          {/* Comparison callout */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">
                  Diferente do iFood e similares
                </h4>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  Aqui você paga <strong className="text-green-700">ZERO TAXA por venda</strong>. 
                  Sem comissão de 12-27% por pedido. Todo o lucro é seu!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
