import { ShoppingCart } from 'lucide-react';

export function PizzaMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-orange-950 to-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-orange-900/50">
        <p className="text-[10px] text-orange-300">Pizza Grande</p>
        <h3 className="text-sm font-semibold text-orange-400">Meio a Meio</h3>
      </div>

      {/* Pizza Visual */}
      <div className="relative h-28 flex items-center justify-center bg-gradient-to-b from-orange-900/20 to-transparent">
        <div className="relative w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-700 overflow-hidden">
          {/* Half 1 */}
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center">
            <span className="text-2xl rotate-[-20deg]">🍕</span>
          </div>
          {/* Half 2 */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-600 to-amber-500 flex items-center justify-center">
            <span className="text-2xl rotate-[20deg]">🧀</span>
          </div>
          {/* Divider */}
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-800 -translate-x-1/2" />
        </div>
      </div>

      {/* Flavor Selection */}
      <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto">
        {/* First Half */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <p className="text-[9px] text-orange-400 uppercase tracking-wider">1ª Metade</p>
          </div>
          <div className="p-2 rounded-lg bg-orange-900/30 border border-orange-700/50">
            <p className="text-[11px] font-medium">Calabresa</p>
            <p className="text-[8px] text-orange-300">Calabresa, cebola, azeitona</p>
          </div>
        </div>

        {/* Second Half */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <p className="text-[9px] text-orange-400 uppercase tracking-wider">2ª Metade</p>
          </div>
          <div className="p-2 rounded-lg bg-orange-900/30 border border-orange-700/50">
            <p className="text-[11px] font-medium">Quatro Queijos</p>
            <p className="text-[8px] text-orange-300">Mussarela, gorgonzola, parmesão, catupiry</p>
          </div>
        </div>

        {/* Crust */}
        <div>
          <p className="text-[9px] text-orange-400 uppercase tracking-wider mb-1">Borda Recheada</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              { name: 'Catupiry', price: '+8', selected: true },
              { name: 'Cheddar', price: '+8', selected: false },
              { name: 'Chocolate', price: '+10', selected: false },
              { name: 'Sem Borda', price: '', selected: false },
            ].map((crust) => (
              <button 
                key={crust.name} 
                className={`p-1.5 rounded-lg text-center ${crust.selected ? 'bg-orange-600 ring-1 ring-orange-400' : 'bg-orange-900/30'}`}
              >
                <span className="text-[9px] block">{crust.name}</span>
                {crust.price && <span className="text-[8px] text-orange-300">{crust.price}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Size Summary */}
        <div className="p-2 rounded-lg bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-700/30">
          <div className="flex justify-between text-[9px]">
            <span className="text-orange-300">Pizza Grande (8 fatias)</span>
            <span className="text-orange-400 font-medium">R$ 55,90</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-orange-300">Borda Catupiry</span>
            <span className="text-orange-400 font-medium">R$ 8,00</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-orange-950 border-t border-orange-900/50">
        <button className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          Finalizar • R$ 63,90
        </button>
      </div>
    </div>
  );
}
