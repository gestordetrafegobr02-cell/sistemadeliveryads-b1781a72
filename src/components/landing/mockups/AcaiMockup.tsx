import { ShoppingCart } from 'lucide-react';
import acaiImage from '@/assets/demo-acai.jpg';

export function AcaiMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-purple-950 to-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-purple-900/50">
        <p className="text-[10px] text-purple-300">Monte seu</p>
        <h3 className="text-sm font-semibold text-purple-400">Açaí 500ml</h3>
      </div>

      {/* Product Image */}
      <div className="relative h-20 overflow-hidden">
        <img 
          src={acaiImage} 
          alt="Açaí 500ml" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 to-transparent" />
        <div className="absolute bottom-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          R$ 18,00
        </div>
      </div>

      {/* Toppings Selection */}
      <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto">
        {/* Fruits */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] text-purple-400 uppercase tracking-wider">Frutas (até 3)</p>
            <span className="text-[8px] text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded-full">2/3</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { emoji: '🍌', name: 'Banana', selected: true },
              { emoji: '🍓', name: 'Morango', selected: true },
              { emoji: '🥝', name: 'Kiwi', selected: false },
              { emoji: '🫐', name: 'Mirtilo', selected: false },
              { emoji: '🥭', name: 'Manga', selected: false },
              { emoji: '🍑', name: 'Pêssego', selected: false },
            ].map((fruit) => (
              <button 
                key={fruit.name} 
                className={`p-1.5 rounded-lg text-center ${fruit.selected ? 'bg-purple-600 ring-1 ring-purple-400' : 'bg-purple-900/30'}`}
              >
                <span className="text-lg block">{fruit.emoji}</span>
                <span className="text-[8px]">{fruit.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Adicionais com preços */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] text-purple-400 uppercase tracking-wider">Adicionais</p>
            <span className="text-[8px] text-pink-300 bg-pink-500/20 px-1.5 py-0.5 rounded-full">Extras</span>
          </div>
          <div className="space-y-1">
            {[
              { name: 'Granola', price: 'Grátis', selected: true, free: true },
              { name: 'Leite em Pó', price: 'Grátis', selected: true, free: true },
              { name: 'Nutella', price: '+R$ 5,00', selected: false, free: false },
              { name: 'Leite Condensado', price: '+R$ 3,00', selected: true, free: false },
              { name: 'Paçoca', price: '+R$ 2,00', selected: false, free: false },
            ].map((topping) => (
              <div key={topping.name} className="flex items-center justify-between p-1.5 rounded-lg bg-purple-900/30">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${topping.selected ? 'bg-purple-500' : 'border border-purple-600'}`}>
                    {topping.selected && <span className="text-[8px] text-white flex items-center justify-center">✓</span>}
                  </div>
                  <span className="text-[10px]">{topping.name}</span>
                </div>
                <span className={`text-[9px] font-medium ${topping.free ? 'text-green-400' : 'text-pink-400'}`}>
                  {topping.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Syrups */}
        <div>
          <p className="text-[9px] text-purple-400 uppercase tracking-wider mb-1">Caldas (+R$ 2,00 cada)</p>
          <div className="flex gap-1">
            {[
              { name: 'Morango', color: 'bg-red-500' },
              { name: 'Chocolate', color: 'bg-amber-800' },
              { name: 'Leite Cond.', color: 'bg-amber-200' },
            ].map((syrup, i) => (
              <button 
                key={syrup.name} 
                className={`flex-1 py-1.5 rounded-lg text-center ${i === 1 ? 'ring-2 ring-purple-400' : ''} bg-purple-900/30`}
              >
                <div className={`w-4 h-4 rounded-full ${syrup.color} mx-auto mb-0.5`} />
                <span className="text-[8px]">{syrup.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-purple-950 border-t border-purple-900/50">
        <button className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          Adicionar • R$ 23,00
        </button>
      </div>
    </div>
  );
}
