// Store visual template definitions
export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
}

export const STORE_TEMPLATES: Record<string, StoreTemplate> = {
  default: {
    id: 'default',
    name: 'Padrão',
    description: 'Tema limpo e moderno com fundo branco',
    background: '0 0% 100%',
    foreground: '220 20% 20%',
    card: '0 0% 100%',
    cardForeground: '220 20% 20%',
    primary: '25 95% 53%',
    primaryForeground: '0 0% 100%',
    secondary: '220 14% 96%',
    secondaryForeground: '220 20% 20%',
    muted: '220 14% 96%',
    mutedForeground: '220 10% 45%',
    accent: '25 95% 53%',
    accentForeground: '0 0% 100%',
    border: '220 14% 90%',
  },
  premium_dark: {
    id: 'premium_dark',
    name: 'Premium',
    description: 'Dark elegante com laranja vibrante',
    background: '0 0% 0%',
    foreground: '40 20% 95%',
    card: '0 0% 6%',
    cardForeground: '40 20% 95%',
    primary: '33 100% 50%',
    primaryForeground: '0 0% 0%',
    secondary: '0 0% 10%',
    secondaryForeground: '40 20% 90%',
    muted: '0 0% 12%',
    mutedForeground: '40 10% 55%',
    accent: '33 100% 50%',
    accentForeground: '0 0% 0%',
    border: '0 0% 15%',
  },
  classic_light: {
    id: 'classic_light',
    name: 'Classic',
    description: 'Claro e clean, ideal para qualquer segmento',
    background: '0 0% 98%',
    foreground: '220 20% 15%',
    card: '0 0% 100%',
    cardForeground: '220 20% 15%',
    primary: '220 70% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '220 14% 95%',
    secondaryForeground: '220 20% 20%',
    muted: '220 14% 93%',
    mutedForeground: '220 10% 45%',
    accent: '220 70% 50%',
    accentForeground: '0 0% 100%',
    border: '220 14% 88%',
  },
  classic_red: {
    id: 'classic_red',
    name: 'Red',
    description: 'Vibrante com vermelho marcante e fundo escuro',
    background: '0 0% 5%',
    foreground: '0 0% 95%',
    card: '0 20% 8%',
    cardForeground: '0 0% 95%',
    primary: '354 70% 56%',
    primaryForeground: '0 0% 100%',
    secondary: '0 15% 12%',
    secondaryForeground: '0 0% 90%',
    muted: '0 10% 14%',
    mutedForeground: '0 5% 55%',
    accent: '354 70% 56%',
    accentForeground: '0 0% 100%',
    border: '0 10% 18%',
  },
};

export function getTemplateById(id: string): StoreTemplate {
  return STORE_TEMPLATES[id] || STORE_TEMPLATES.default;
}
