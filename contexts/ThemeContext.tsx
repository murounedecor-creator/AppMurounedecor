import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '@/constants/colors';

const THEME_STORAGE_KEY = '@muroune_theme_preference';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeColors: typeof lightColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(value => {
        if (value === 'dark') setIsDarkMode(true);
      })
      .catch(error => console.error('Erro ao carregar tema:', error));
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(error =>
      console.error('Erro ao salvar tema:', error)
    );
  };

  const themeColors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de um ThemeProvider');
  }
  return context;
}
