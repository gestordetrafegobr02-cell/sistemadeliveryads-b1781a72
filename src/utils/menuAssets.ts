// Static, CDN-hosted image bank for the admin product editor.
// Store owners pick a thumbnail and the URL is applied directly to the product
// (no upload, no storage processing).

export interface MenuAssetItem {
  id: string;
  name: string;
  url: string;
}

export interface MenuAssetCategory {
  id: string;
  label: string;
  items: MenuAssetItem[];
}

export const MENU_ASSET_BANK: MenuAssetCategory[] = [
  {
    id: 'burgers',
    label: 'Hambúrgueres',
    items: [
      {
        id: 'burger-smash',
        name: 'Smash',
        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'burger-bacon-cheddar',
        name: 'Bacon Cheddar',
        url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'burger-artisan',
        name: 'Artesanal / Gourmet',
        url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sides',
    label: 'Acompanhamentos',
    items: [
      {
        id: 'side-fries',
        name: 'Batata Frita',
        url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'side-rustic-fries',
        name: 'Batata Rústica',
        url: 'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'side-onion-rings',
        name: 'Onion Rings',
        url: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'drinks',
    label: 'Bebidas',
    items: [
      {
        id: 'drink-cola',
        name: 'Coca / Cola',
        url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'drink-guarana',
        name: 'Guaraná',
        url: 'https://images.unsplash.com/photo-1629235483984-3c87fdf3ee9a?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'drink-juice',
        name: 'Suco Natural',
        url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
];
