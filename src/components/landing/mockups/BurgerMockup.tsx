import { Search, ShoppingBag, Flame, Plus } from 'lucide-react';

const featured = [
  {
    name: 'Smash Duplo Bacon',
    desc: '2 carnes 90g, cheddar, bacon, cebola caramelizada',
    price: 'R$ 34,90',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Combo Executivo',
    desc: 'Cheeseburger + batata + refri lata',
    price: 'R$ 39,90',
    img: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&auto=format&fit=crop&q=80',
  },
];

const items = [
  {
    name: 'Smash Bacon',
    desc: 'Smash 90g, bacon, cheddar duplo',
    price: 'R$ 27,90',
    img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Costela BBQ',
    desc: 'Blend 180g, cheddar, cebola crispy',
    price: 'R$ 32,90',
    img: 'https://images.unsplash.com/photo-1615297928064-24977384d0da?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Batata Cheddar Bacon',
    desc: 'Batata frita com cheddar cremoso',
    price: 'R$ 26,90',
    img: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=200&auto=format&fit=crop&q=80',
  },
];

export function BurgerMockup() {
  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Store Header */}
      <div className="px-3 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-black text-neutral-900">
            BH
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold truncate">Burger House</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-emerald-400">Aberto agora</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-1.5 bg-neutral-900 rounded-lg px-2 py-1.5">
          <Search className="w-2.5 h-2.5 text-neutral-500" />
          <span className="text-[9px] text-neutral-500">Buscar no cardápio</span>
        </div>
      </div>

      {/* Categories chips */}
      <div className="px-3 pb-1.5 flex gap-1 overflow-x-auto">
        {['🔥 Destaques', 'Combos', 'Smash', 'Artesanais', 'Bebidas'].map((c, i) => (
          <span
            key={c}
            className={`text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap ${
              i === 0
                ? 'bg-amber-500 text-neutral-900 font-bold'
                : 'bg-neutral-900 text-neutral-400'
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Menu list */}
      <div className="flex-1 px-3 pb-2 space-y-2 overflow-y-auto">
        {/* Featured section */}
        <div className="flex items-center gap-1 pt-1">
          <Flame className="w-2.5 h-2.5 text-amber-500" />
          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
            Destaques
          </span>
        </div>
        {featured.map((p) => (
          <div key={p.name} className="flex gap-2 bg-neutral-900 rounded-xl p-1.5 border border-amber-500/20">
            <img src={p.img} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate">{p.name}</p>
              <p className="text-[8px] text-neutral-400 line-clamp-2 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-amber-500 mt-0.5">{p.price}</p>
            </div>
            <button className="self-end w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-neutral-900">
              <Plus className="w-3 h-3" strokeWidth={3} />
            </button>
          </div>
        ))}

        <div className="pt-1">
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
            Artesanais
          </span>
        </div>
        {items.map((p) => (
          <div key={p.name} className="flex gap-2 bg-neutral-900 rounded-xl p-1.5">
            <img src={p.img} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{p.name}</p>
              <p className="text-[8px] text-neutral-500 line-clamp-1 leading-tight">{p.desc}</p>
              <p className="text-[10px] font-bold text-amber-500 mt-0.5">{p.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cart button */}
      <div className="px-3 py-2 bg-neutral-900 border-t border-neutral-800">
        <button className="w-full py-2 bg-amber-500 text-neutral-900 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5">
          <ShoppingBag className="w-3 h-3" />
          Ver carrinho • R$ 74,80
        </button>
      </div>
    </div>
  );
}
