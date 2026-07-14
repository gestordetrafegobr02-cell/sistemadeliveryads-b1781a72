import { Search, ShoppingBag, Flame, Plus } from 'lucide-react';

const featured = [
  {
    name: 'Pizza Grande Meio a Meio',
    desc: 'Escolha 2 sabores tradicionais - 8 fatias',
    price: 'R$ 55,90',
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Combo Família',
    desc: 'Pizza grande + refri 2L + borda catupiry',
    price: 'R$ 79,90',
    img: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&auto=format&fit=crop&q=80',
  },
];

const items = [
  {
    name: 'Calabresa',
    desc: 'Mussarela, calabresa, cebola e orégano',
    price: 'R$ 49,90',
    img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Marguerita',
    desc: 'Mussarela de búfala, tomate e manjericão',
    price: 'R$ 54,90',
    img: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Quatro Queijos',
    desc: 'Mussarela, gorgonzola, parmesão, catupiry',
    price: 'R$ 59,90',
    img: 'https://images.unsplash.com/photo-1548369937-47519962c11a?w=200&auto=format&fit=crop&q=80',
  },
];

export function PizzaMockup() {
  return (
    <div className="h-full bg-gradient-to-b from-orange-950 to-neutral-950 text-white flex flex-col">
      {/* Store Header */}
      <div className="px-3 py-2 border-b border-orange-900/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-[10px] font-black text-white">
            PZ
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold truncate">Pizzaria Bella</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-emerald-400">Aberto agora</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-1.5 bg-orange-900/40 rounded-lg px-2 py-1.5">
          <Search className="w-2.5 h-2.5 text-orange-300" />
          <span className="text-[9px] text-orange-300">Buscar no cardápio</span>
        </div>
      </div>

      {/* Categories chips */}
      <div className="px-3 pb-1.5 flex gap-1 overflow-x-auto">
        {['🔥 Destaques', 'Tradicionais', 'Especiais', 'Doces', 'Bordas'].map((c, i) => (
          <span
            key={c}
            className={`text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap ${
              i === 0
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-orange-900/40 text-orange-300'
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Menu list */}
      <div className="flex-1 px-3 pb-2 space-y-2 overflow-y-auto">
        <div className="flex items-center gap-1 pt-1">
          <Flame className="w-2.5 h-2.5 text-orange-400" />
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">
            Destaques
          </span>
        </div>
        {featured.map((p) => (
          <div
            key={p.name}
            className="flex gap-2 bg-orange-900/30 rounded-xl p-1.5 border border-orange-500/30"
          >
            <img src={p.img} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate">{p.name}</p>
              <p className="text-[8px] text-orange-300 line-clamp-2 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-orange-400 mt-0.5">{p.price}</p>
            </div>
            <button className="self-end w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white">
              <Plus className="w-3 h-3" strokeWidth={3} />
            </button>
          </div>
        ))}

        <div className="pt-1">
          <span className="text-[9px] font-bold text-orange-300 uppercase tracking-wider">
            Tradicionais
          </span>
        </div>
        {items.map((p) => (
          <div key={p.name} className="flex gap-2 bg-orange-900/30 rounded-xl p-1.5">
            <img src={p.img} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{p.name}</p>
              <p className="text-[8px] text-orange-300/70 line-clamp-1 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-orange-400 mt-0.5">{p.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cart button */}
      <div className="px-3 py-2 bg-orange-950 border-t border-orange-900/50">
        <button className="w-full py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5">
          <ShoppingBag className="w-3 h-3" />
          Ver carrinho • R$ 135,80
        </button>
      </div>
    </div>
  );
}
