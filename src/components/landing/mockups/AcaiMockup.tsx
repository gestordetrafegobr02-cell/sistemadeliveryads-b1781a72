import { Search, ShoppingBag, Flame, Plus } from 'lucide-react';

const featured = [
  {
    name: 'Tigelão da Casa 700ml',
    desc: 'Açaí batido com banana, morango, granola e leite condensado',
    price: 'R$ 32,90',
    img: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Barca do Casal 1L',
    desc: 'Açaí premium com 6 acompanhamentos para 2 pessoas',
    price: 'R$ 49,90',
    img: 'https://images.unsplash.com/photo-1638176067000-9e51de9be99a?w=400&auto=format&fit=crop&q=80',
  },
];

const items = [
  {
    name: 'Copo 500ml',
    desc: 'Açaí puro com 3 acompanhamentos',
    price: 'R$ 22,90',
    img: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Copo 700ml',
    desc: 'Açaí puro com 4 acompanhamentos',
    price: 'R$ 28,90',
    img: 'https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tigelão 1 Litro',
    desc: 'Açaí generoso com 5 acompanhamentos',
    price: 'R$ 42,90',
    img: 'https://images.unsplash.com/photo-1583334513367-b8e2c8e33ad0?w=200&auto=format&fit=crop&q=80',
  },
];

export function AcaiMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-purple-950 to-neutral-950 text-white flex flex-col">
      {/* Store Header */}
      <div className="px-3 py-2 border-b border-purple-900/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-[10px] font-black text-white">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold truncate">Açaí do Ponto</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-emerald-400">Aberto agora</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-1.5 bg-purple-900/40 rounded-lg px-2 py-1.5">
          <Search className="w-2.5 h-2.5 text-purple-300" />
          <span className="text-[9px] text-purple-300">Buscar no cardápio</span>
        </div>
      </div>

      {/* Categories chips */}
      <div className="px-3 pb-1.5 flex gap-1 overflow-x-auto">
        {['🔥 Destaques', 'Copos', 'Tigelões', 'Frutas', 'Cremes'].map((c, i) => (
          <span
            key={c}
            className={`text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap ${
              i === 0
                ? 'bg-purple-500 text-white font-bold'
                : 'bg-purple-900/40 text-purple-300'
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Menu list */}
      <div className="flex-1 px-3 pb-2 space-y-2 overflow-y-auto">
        <div className="flex items-center gap-1 pt-1">
          <Flame className="w-2.5 h-2.5 text-purple-400" />
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">
            Destaques
          </span>
        </div>
        {featured.map((p) => (
          <div
            key={p.name}
            className="flex gap-2 bg-purple-900/30 rounded-xl p-1.5 border border-purple-500/30"
          >
            <img src={p.img} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate">{p.name}</p>
              <p className="text-[8px] text-purple-300 line-clamp-2 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-purple-300 mt-0.5">{p.price}</p>
            </div>
            <button className="self-end w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white">
              <Plus className="w-3 h-3" strokeWidth={3} />
            </button>
          </div>
        ))}

        <div className="pt-1">
          <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">
            Copos & Tigelões
          </span>
        </div>
        {items.map((p) => (
          <div key={p.name} className="flex gap-2 bg-purple-900/30 rounded-xl p-1.5">
            <img src={p.img} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{p.name}</p>
              <p className="text-[8px] text-purple-300/70 line-clamp-1 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-purple-300 mt-0.5">{p.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cart button */}
      <div className="px-3 py-2 bg-purple-950 border-t border-purple-900/50">
        <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5">
          <ShoppingBag className="w-3 h-3" />
          Ver carrinho • R$ 82,80
        </button>
      </div>
    </div>
  );
}
