export const lightColors = {
  primary: {
    light: '#F5F0EB',
    main: '#C9A96E',
    dark: '#8B6914',
  },
  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#FAFAF8',
  border: '#E8E3DC',
  text: {
    primary: '#5C3D1E',
    secondary: '#8B6F47',
    light: '#B8A789',
    disabled: '#D4C4B3',
  },
  status: {
    pending: '#FFB800',
    waiting: '#FF9500',
    inProgress: '#0070F3',
    completed: '#00B341',
    cancelled: '#F31260',
  },
  success: '#00B341',
  warning: '#FFB800',
  error: '#F31260',
  info: '#0070F3',
  revenue: '#00B341',
  expense: '#F31260',
};

export const darkColors = {
  primary: {
    light: '#3D3319',
    main: '#C9A96E',
    dark: '#E8C77E',
  },
  white: '#FFFFFF',
  background: '#1C1810',
  surface: '#26211A',
  border: '#3A3226',
  text: {
    primary: '#F0E6D6',
    secondary: '#C9A96E',
    light: '#8B7F6A',
    disabled: '#5C5344',
  },
  status: {
    pending: '#FFB800',
    waiting: '#FF9500',
    inProgress: '#0070F3',
    completed: '#00B341',
    cancelled: '#F31260',
  },
  success: '#00B341',
  warning: '#FFB800',
  error: '#F31260',
  info: '#0070F3',
  revenue: '#00B341',
  expense: '#F31260',
};

export const colors = lightColors;

export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
