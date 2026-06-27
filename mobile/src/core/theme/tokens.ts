export const colors = {
  // Primary — Transporti Blue (trust, reliability)
  primary: {
    50: '#E8F4FD',
    100: '#B9DEF7',
    500: '#1A73E8',
    700: '#1557B0',
    900: '#0D3F82',
  },
  // Secondary — Success Green (completion, payment)
  success: {
    50: '#E6F7ED',
    500: '#34A853',
    700: '#1E7E34',
  },
  // Warning — Amber (attention, pending)
  warning: {
    50: '#FFF8E1',
    500: '#F9A825',
    700: '#F57F17',
  },
  // Error — Red (failure, dispute)
  error: {
    50: '#FDECEE',
    500: '#EA4335',
    700: '#C62828',
  },
  // Neutral — Gray scale
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FA',
    100: '#F1F3F4',
    200: '#E8EAED',
    400: '#9AA0A6',
    600: '#5F6368',
    800: '#3C4043',
    900: '#202124',
  },
  // Semantic
  background: {
    default: '#F8F9FA',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#202124',
    secondary: '#5F6368',
    disabled: '#9AA0A6',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E8EAED',
    focus: '#1A73E8',
  },
};

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    arabic: 'Noto_Sans_Arabic', // RTL font
  },
  sizes: {
    xs: { fontSize: 11, lineHeight: 16 },
    sm: { fontSize: 13, lineHeight: 18 },
    base: { fontSize: 15, lineHeight: 22 },
    lg: { fontSize: 17, lineHeight: 24 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 38 },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const elevation = {
  none: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  sm: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, shadowOpacity: 0.08, elevation: 1 },
  md: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, shadowOpacity: 0.12, elevation: 3 },
  lg: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, shadowOpacity: 0.16, elevation: 6 },
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  elevation,
};
