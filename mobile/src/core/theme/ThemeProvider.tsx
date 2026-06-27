import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, I18nManager } from 'react-native';
import { theme as defaultTheme } from './tokens';

type ThemeContextType = {
  theme: typeof defaultTheme;
  isDark: boolean;
  isRTL: boolean;
  toggleRTL: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL);

  const toggleRTL = () => {
    const nextRTL = !isRTL;
    I18nManager.forceRTL(nextRTL);
    setIsRTL(nextRTL);
  };

  const activeTheme = {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      background: isDark
        ? { default: '#121212', card: '#1E1E1E', elevated: '#2C2C2C' }
        : defaultTheme.colors.background,
      text: isDark
        ? { primary: '#FFFFFF', secondary: '#E0E0E0', disabled: '#757575', inverse: '#000000' }
        : defaultTheme.colors.text,
      border: isDark
        ? { default: '#2C2C2C', focus: '#1A73E8' }
        : defaultTheme.colors.border,
    },
  };

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, isDark, isRTL, toggleRTL }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
