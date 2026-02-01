import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { themeClasses } from './themeClasses';

// Theme types
export type ThemeId = 'neonVapor' | 'circuitBoard' | 'holographic';

export interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
}

// Theme display names
export const themeNames: Record<ThemeId, string> = {
  neonVapor: 'Neon Vapor',
  circuitBoard: 'Circuit Board',
  holographic: 'Holographic',
};

// Theme order for cycling
const themeOrder: ThemeId[] = ['neonVapor', 'circuitBoard', 'holographic'];

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Local storage key
const THEME_STORAGE_KEY = 'cyber-grid-theme';

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themeOrder.includes(stored as ThemeId)) {
        return stored as ThemeId;
      }
    }
    return 'neonVapor'; // Default theme
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setThemeState(themeOrder[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get theme classes for an element
export function useThemeClass(element: keyof typeof themeClasses.neonVapor) {
  const { theme } = useTheme();
  return themeClasses[theme][element] || '';
}
