/**
 * Color palette for DR-RAG mobile app.
 * Medical/professional theme with calming teal primary.
 */

export const colors = {
  // Primary - Calming Teal/Blue-Green
  primary: {
    50: '#E0F7F4',
    100: '#B3ECE4',
    200: '#80E0D2',
    300: '#4DD4C0',
    400: '#26CAB3',
    500: '#00BFA5', // Main primary
    600: '#00A896',
    700: '#008F82',
    800: '#00766E',
    900: '#005249',
  },

  // Secondary - Warm Amber (for accents)
  secondary: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFA726', // Main secondary
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Neutrals
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Semantic colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8FAFB',
  card: '#FFFFFF',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E0E0E0',
  borderLight: '#EEEEEE',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
};

// Theme for React Native Paper
export const paperTheme = {
  colors: {
    primary: colors.primary[500],
    primaryContainer: colors.primary[100],
    secondary: colors.secondary[500],
    secondaryContainer: colors.secondary[100],
    surface: colors.surface,
    surfaceVariant: colors.neutral[100],
    background: colors.background,
    error: colors.error,
    errorContainer: colors.errorLight,
    onPrimary: colors.textOnPrimary,
    onPrimaryContainer: colors.primary[900],
    onSecondary: colors.textOnPrimary,
    onSecondaryContainer: colors.secondary[900],
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    onError: colors.textOnPrimary,
    onErrorContainer: colors.error,
    onBackground: colors.textPrimary,
    outline: colors.border,
    outlineVariant: colors.borderLight,
    inverseSurface: colors.neutral[800],
    inverseOnSurface: colors.neutral[50],
    inversePrimary: colors.primary[200],
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.neutral[50],
      level3: colors.neutral[100],
      level4: colors.neutral[100],
      level5: colors.neutral[200],
    },
  },
};

export default colors;
