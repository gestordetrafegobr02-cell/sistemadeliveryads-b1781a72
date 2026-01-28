import { Plus, Minus, ShoppingCart } from 'lucide-react';
import burgerImage from '@/assets/demo-burger.jpg';

export function BurgerMockup() {
  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-800">
        <p className="text-[10px] text-neutral-400">Personalize seu</p>
        <h3 className="text-sm font-semibold text-amber-500">Smash Burger</h3>
      </div>

      {/* Product Image */}
      <div className="relative h-24 overflow-hidden">
        <img 
          src={burgerImage} 
          alt="Smash Burger" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 to-transparent" />
        <div className="absolute bottom-2 right-2 bg-amber-500 text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
          R$ 24,90
        </div>
      </div>

      {/* Customization Options */}
      <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto">
        {/* Bread Selection */}
        <div>
          <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">Escolha o Pão</p>
          <div className="space-y-1">
            {['Brioche', 'Australiano', 'Sem Glúten (+2)'].map((bread, i) => (
              <label key={bread} className="flex items-center gap-2 p-1.5 rounded-lg bg-neutral-900 cursor-pointer">
                <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'border-amber-500 bg-amber-500' : 'border-neutral-600'}`} />
                <span className="text-[10px]">{bread}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meat Point */}
        <div>
          <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">Ponto da Carne</p>
          <div className="flex gap-1">
            {['Mal', 'Médio', 'Bem'].map((point, i) => (
              <button 
                key={point} 
                className={`flex-1 py-1 text-[9px] rounded-lg ${i === 1 ? 'bg-amber-500 text-neutral-900 font-medium' : 'bg-neutral-800'}`}
              >
                {point}
              </button>
            ))}
          </div>
        </div>

        {/* Extras - Adicionais com preços */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Adicionais</p>
            <span className="text-[8px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">Extras</span>
          </div>
          <div className="space-y-1">
            {[
              { name: 'Bacon Extra', price: '+R$ 4,00', selected: true },
              { name: 'Queijo Cheddar', price: '+R$ 3,00', selected: false },
              { name: 'Ovo Frito', price: '+R$ 2,50', selected: true },
              { name: 'Cebola Caramelizada', price: '+R$ 2,00', selected: false },
              { name: 'Molho Especial', price: '+R$ 1,50', selected: false },
            ].map((extra) => (
              <div key={extra.name} className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-900">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${extra.selected ? 'bg-amber-500' : 'border border-neutral-600'}`}>
                    {extra.selected && <span className="text-[8px] text-neutral-900 flex items-center justify-center">✓</span>}
                  </div>
                  <span className="text-[10px]">{extra.name}</span>
                </div>
                <span className="text-[9px] text-amber-400 font-medium">{extra.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-neutral-900 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-bold">1</span>
            <button className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-neutral-900">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-sm font-bold text-amber-500">R$ 31,40</span>
        </div>
        <button className="w-full py-2 bg-amber-500 text-neutral-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          Adicionar ao Carrinho
        </button>
      </div>
    </div>
  );
}
