import { createContext, useContext, useEffect } from 'react';
import { getTemplateById } from '@/lib/storeTemplates';

interface StoreThemeContextType {
  primaryColor: string | null;
  templateStyle: string | null;
  bgColor: string | null;
  cardStyle: string | null;
}

const StoreThemeContext = createContext<StoreThemeContextType>({
  primaryColor: null,
  templateStyle: null,
  bgColor: null,
  cardStyle: null,
});

export function useStoreTheme() {
  return useContext(StoreThemeContext);
}

interface StoreThemeProviderProps {
  primaryColor: string | null;
  templateStyle?: string | null;
  bgColor?: string | null;
  cardStyle?: string | null;
  children: React.ReactNode;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function isColorDark(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return false;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const CSS_VARS = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground', '--accent', '--accent-foreground', '--border',
  '--input', '--ring', '--radius',
] as const;

export function StoreThemeProvider({ primaryColor, templateStyle, bgColor, cardStyle, children }: StoreThemeProviderProps) {
  useEffect(() => {
    const el = document.documentElement;

    // Apply template if specified and not default
    if (templateStyle && templateStyle !== 'default') {
      const template = getTemplateById(templateStyle);
      el.style.setProperty('--background', template.background);
      el.style.setProperty('--foreground', template.foreground);
      el.style.setProperty('--card', template.card);
      el.style.setProperty('--card-foreground', template.cardForeground);
      el.style.setProperty('--primary', template.primary);
      el.style.setProperty('--primary-foreground', template.primaryForeground);
      el.style.setProperty('--secondary', template.secondary);
      el.style.setProperty('--secondary-foreground', template.secondaryForeground);
      el.style.setProperty('--muted', template.muted);
      el.style.setProperty('--muted-foreground', template.mutedForeground);
      el.style.setProperty('--accent', template.accent);
      el.style.setProperty('--accent-foreground', template.accentForeground);
      el.style.setProperty('--border', template.border);
      el.style.setProperty('--input', template.border);
      el.style.setProperty('--ring', template.primary);
    } else {
      // Default dark premium theme when no template is set
      if (!primaryColor && !bgColor) {
        el.style.setProperty('--background', '0 0% 7%');
        el.style.setProperty('--foreground', '0 0% 100%');
        el.style.setProperty('--card', '0 0% 12%');
        el.style.setProperty('--card-foreground', '0 0% 100%');
        el.style.setProperty('--primary', '16 100% 50%');
        el.style.setProperty('--primary-foreground', '0 0% 100%');
        el.style.setProperty('--secondary', '0 0% 15%');
        el.style.setProperty('--secondary-foreground', '0 0% 90%');
        el.style.setProperty('--muted', '0 0% 15%');
        el.style.setProperty('--muted-foreground', '0 0% 60%');
        el.style.setProperty('--accent', '16 100% 50%');
        el.style.setProperty('--accent-foreground', '0 0% 100%');
        el.style.setProperty('--border', '0 0% 18%');
        el.style.setProperty('--input', '0 0% 18%');
        el.style.setProperty('--ring', '16 100% 50%');
      }

      // Apply individual color overrides
      if (primaryColor) {
        const hsl = hexToHSL(primaryColor);
        if (hsl) {
          el.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
          el.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
          el.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        }
      }

      if (bgColor) {
        const bgHsl = hexToHSL(bgColor);
        if (bgHsl) {
          const dark = isColorDark(bgColor);
          el.style.setProperty('--background', `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`);
          el.style.setProperty('--foreground', dark ? '0 0% 95%' : '0 0% 10%');
          el.style.setProperty('--card', dark
            ? `${bgHsl.h} ${bgHsl.s}% ${Math.min(bgHsl.l + 8, 100)}%`
            : `${bgHsl.h} ${bgHsl.s}% ${Math.min(bgHsl.l + 2, 100)}%`
          );
          el.style.setProperty('--card-foreground', dark ? '0 0% 95%' : '0 0% 10%');
          el.style.setProperty('--secondary', dark
            ? `${bgHsl.h} ${bgHsl.s}% ${Math.min(bgHsl.l + 12, 100)}%`
            : `${bgHsl.h} ${Math.max(bgHsl.s - 5, 0)}% ${Math.max(bgHsl.l - 5, 0)}%`
          );
          el.style.setProperty('--secondary-foreground', dark ? '0 0% 90%' : '0 0% 15%');
          el.style.setProperty('--muted', dark
            ? `${bgHsl.h} ${bgHsl.s}% ${Math.min(bgHsl.l + 10, 100)}%`
            : `${bgHsl.h} ${Math.max(bgHsl.s - 3, 0)}% ${Math.max(bgHsl.l - 4, 0)}%`
          );
          el.style.setProperty('--muted-foreground', dark ? '0 0% 60%' : '0 0% 45%');
          el.style.setProperty('--border', dark ? `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l + 15}%` : `${bgHsl.h} ${bgHsl.s}% ${Math.max(bgHsl.l - 10, 0)}%`);
          el.style.setProperty('--input', dark ? `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l + 15}%` : `${bgHsl.h} ${bgHsl.s}% ${Math.max(bgHsl.l - 10, 0)}%`);
        }
      }
    }

    // Apply card style radius
    if (cardStyle === 'square') {
      el.style.setProperty('--radius', '0.25rem');
    } else {
      el.style.setProperty('--radius', '1.25rem');
    }

    return () => {
      CSS_VARS.forEach((v) => el.style.removeProperty(v));
    };
  }, [primaryColor, templateStyle, bgColor, cardStyle]);

  return (
    <StoreThemeContext.Provider value={{ primaryColor, templateStyle: templateStyle ?? null, bgColor: bgColor ?? null, cardStyle: cardStyle ?? null }}>
      {children}
    </StoreThemeContext.Provider>
  );
}
