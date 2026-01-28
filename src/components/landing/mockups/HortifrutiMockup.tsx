import { ShoppingCart, Scale, Package } from 'lucide-react';
import hortifrutiImage from '@/assets/demo-hortifruti.jpg';

export function HortifrutiMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-green-950 to-neutral-950 text-white flex flex-col">
      {/* Header with image */}
      <div className="relative h-16 overflow-hidden">
        <img 
          src={hortifrutiImage} 
          alt="Hortifruti Frescos" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-green-950 to-transparent" />
        <div className="absolute bottom-1 left-3 right-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-green-300">🥬 Hortifruti</p>
            <h3 className="text-sm font-semibold text-green-400">Produtos Frescos</h3>
          </div>
          <span className="text-[8px] bg-green-600 px-2 py-0.5 rounded-full">Frescos Hoje</span>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 px-2 py-2 space-y-2 overflow-y-auto">
        {/* By Weight Item */}
        <div className="p-2 rounded-xl bg-green-900/30 border border-green-800/50">
          <div className="flex gap-2">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-600/30 to-green-900/30 flex items-center justify-center overflow-hidden">
              <span className="text-2xl">🥬</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <Scale className="w-2.5 h-2.5 text-green-400" />
                <span className="text-[8px] text-green-400">Por Kg</span>
              </div>
              <p className="text-[11px] font-medium">Alface Crespa</p>
              <p className="text-[9px] text-green-300">R$ 4,99/kg</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-800/30">
            <div className="flex items-center gap-1">
              <button className="w-5 h-5 rounded-full bg-green-800 text-[10px] flex items-center justify-center">-</button>
              <span className="text-[10px] font-medium px-2">0.5 kg</span>
              <button className="w-5 h-5 rounded-full bg-green-600 text-[10px] flex items-center justify-center">+</button>
            </div>
            <span className="text-[10px] font-bold text-green-400">R$ 2,50</span>
          </div>
        </div>

        {/* By Unit Item */}
        <div className="p-2 rounded-xl bg-green-900/30 border border-green-800/50">
          <div className="flex gap-2">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-red-600/30 to-green-900/30 flex items-center justify-center overflow-hidden">
              <span className="text-2xl">🍅</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="w-2.5 h-2.5 text-green-400" />
                <span className="text-[8px] text-green-400">Por Unidade</span>
              </div>
              <p className="text-[11px] font-medium">Tomate Italiano</p>
              <p className="text-[9px] text-green-300">R$ 1,50 cada</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-800/30">
            <div className="flex items-center gap-1">
              <button className="w-5 h-5 rounded-full bg-green-800 text-[10px] flex items-center justify-center">-</button>
              <span className="text-[10px] font-medium px-2">3 un</span>
              <button className="w-5 h-5 rounded-full bg-green-600 text-[10px] flex items-center justify-center">+</button>
            </div>
            <span className="text-[10px] font-bold text-green-400">R$ 4,50</span>
          </div>
        </div>

        {/* Fruit Item with Offer */}
        <div className="p-2 rounded-xl bg-green-900/30 border border-green-800/50">
          <div className="flex gap-2">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-yellow-600/30 to-green-900/30 flex items-center justify-center overflow-hidden">
              <span className="text-2xl">🍌</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <Scale className="w-2.5 h-2.5 text-green-400" />
                <span className="text-[8px] text-green-400">Por Kg</span>
                <span className="text-[7px] bg-yellow-600/80 px-1 rounded font-bold">OFERTA</span>
              </div>
              <p className="text-[11px] font-medium">Banana Prata</p>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-neutral-500 line-through">R$ 6,99</span>
                <span className="text-[9px] text-green-300 font-medium">R$ 4,99/kg</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-800/30">
            <div className="flex items-center gap-1">
              <button className="w-5 h-5 rounded-full bg-green-800 text-[10px] flex items-center justify-center">-</button>
              <span className="text-[10px] font-medium px-2">1.0 kg</span>
              <button className="w-5 h-5 rounded-full bg-green-600 text-[10px] flex items-center justify-center">+</button>
            </div>
            <span className="text-[10px] font-bold text-green-400">R$ 4,99</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-green-950 border-t border-green-900/50">
        <div className="flex items-center justify-between mb-1.5 text-[9px]">
          <span className="text-green-300">3 itens no carrinho</span>
          <span className="text-green-400 font-medium">R$ 11,99</span>
        </div>
        <button className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          Finalizar Pedido
        </button>
      </div>
    </div>
  );
}
