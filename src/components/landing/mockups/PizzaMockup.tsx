import { ShoppingCart } from 'lucide-react';
import pizzaImage from '@/assets/demo-pizza.jpg';

export function PizzaMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-orange-950 to-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-orange-900/50">
        <p className="text-[10px] text-orange-300">Pizza Grande</p>
        <h3 className="text-sm font-semibold text-orange-400">Meio a Meio</h3>
      </div>

      {/* Pizza Image */}
      <div className="relative h-24 overflow-hidden">
        <img 
          src={pizzaImage} 
          alt="Pizza Meio a Meio" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/90 to-transparent" />
        {/* Half indicators */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">Calabresa</span>
          <span className="bg-amber-500 text-neutral-900 text-[8px] px-1.5 py-0.5 rounded-full">4 Queijos</span>
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

        {/* Crust - Adicionais com preços */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] text-orange-400 uppercase tracking-wider">Borda Recheada</p>
            <span className="text-[8px] text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded-full">Adicional</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { name: 'Catupiry', price: '+R$ 8,00', selected: true },
              { name: 'Cheddar', price: '+R$ 8,00', selected: false },
              { name: 'Chocolate', price: '+R$ 10,00', selected: false },
              { name: 'Sem Borda', price: 'Grátis', selected: false },
            ].map((crust) => (
              <button 
                key={crust.name} 
                className={`p-1.5 rounded-lg text-center ${crust.selected ? 'bg-orange-600 ring-1 ring-orange-400' : 'bg-orange-900/30'}`}
              >
                <span className="text-[9px] block font-medium">{crust.name}</span>
                <span className={`text-[8px] ${crust.selected ? 'text-orange-200' : 'text-orange-400'}`}>{crust.price}</span>
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
