import { createContext, useContext, useEffect } from 'react';

interface StoreThemeContextType {
  primaryColor: string | null;
}

const StoreThemeContext = createContext<StoreThemeContextType>({ primaryColor: null });

export function useStoreTheme() {
  return useContext(StoreThemeContext);
}

interface StoreThemeProviderProps {
  primaryColor: string | null;
  children: React.ReactNode;
}

// Convert HEX to HSL values for CSS custom properties
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
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function StoreThemeProvider({ primaryColor, children }: StoreThemeProviderProps) {
  useEffect(() => {
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      if (hsl) {
        // Apply custom primary color to the document
        document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        document.documentElement.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
    }

    // Cleanup on unmount or color change
    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--ring');
    };
  }, [primaryColor]);

  return (
    <StoreThemeContext.Provider value={{ primaryColor }}>
      {children}
    </StoreThemeContext.Provider>
  );
}
