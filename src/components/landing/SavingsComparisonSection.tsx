import { DollarSign, X, Check, TrendingDown, TrendingUp } from 'lucide-react';

interface SavingsComparisonSectionProps {
  onCtaClick: () => void;
}

export function SavingsComparisonSection({ onCtaClick }: SavingsComparisonSectionProps) {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium mb-6">
            <TrendingDown className="w-4 h-4" />
            Pare de perder dinheiro
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 px-2">
            Pare de dividir seu lucro<br />
            <span className="text-red-500">com o iFood.</span>
          </h2>
          <p className="text-base md:text-lg text-neutral-500 max-w-2xl mx-auto px-2">
            Enquanto outros apps comem até 27% do seu faturamento, aqui você fica com 100%.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-10 md:mb-12">
          {/* Left Card - Other Apps (Red) */}
          <div className="relative bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-red-200 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-red-200/30 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-500 flex items-center justify-center">
                  <X className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-red-700 text-lg">Outros Apps</h3>
                  <p className="text-red-600/70 text-sm">iFood, Rappi, etc.</p>
                </div>
              </div>
              
              <div className="space-y-3 md:space-y-4">
                <div className="bg-white/60 rounded-xl md:rounded-2xl p-3 md:p-4 border border-red-200">
                  <p className="text-xs md:text-sm text-red-600 mb-1">Taxa por pedido</p>
                  <p className="text-2xl md:text-3xl font-bold text-red-700">12% a 27%</p>
                </div>
                
                <div className="bg-white/60 rounded-xl md:rounded-2xl p-3 md:p-4 border border-red-200">
                  <p className="text-xs md:text-sm text-red-600 mb-2">Numa venda de R$ 100:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 text-sm md:text-base">Você recebe:</span>
                    <span className="text-xl md:text-2xl font-bold text-red-700">R$ 73 - R$ 88</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-red-500 mt-2">
                    Fora taxas de entrega e mensalidades...
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card - Our System (Green) */}
          <div className="relative bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-green-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-green-200/30 rounded-full blur-3xl" />
            <div className="absolute -top-2 -right-2">
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-green-500 text-white text-[10px] sm:text-xs font-bold shadow-lg">
                RECOMENDADO
              </span>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-green-700 text-lg">Nosso Sistema</h3>
                  <p className="text-green-600/70 text-sm">MenuDigital</p>
                </div>
              </div>
              
              <div className="space-y-3 md:space-y-4">
                <div className="bg-white/60 rounded-xl md:rounded-2xl p-3 md:p-4 border border-green-300">
                  <p className="text-xs md:text-sm text-green-600 mb-1">Taxa por pedido</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-700">ZERO</p>
                </div>
                
                <div className="bg-white/60 rounded-xl md:rounded-2xl p-3 md:p-4 border border-green-300">
                  <p className="text-xs md:text-sm text-green-600 mb-2">Numa venda de R$ 100:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 text-sm md:text-base">Você recebe:</span>
                    <span className="text-xl md:text-2xl font-bold text-green-700">R$ 100</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-green-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    100% do lucro no seu bolso!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Highlight Box */}
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-amber-200 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-3 px-2">
            Em uma venda de R$ 100,00, você coloca<br />
            <span className="text-green-600">os R$ 100,00 no bolso.</span>
          </h3>
          <p className="text-neutral-600 max-w-xl mx-auto text-sm md:text-base px-2">
            Sem letras miúdas, sem comissões escondidas, sem surpresas no final do mês.
            <strong className="text-neutral-800"> O lucro é 100% seu!</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
