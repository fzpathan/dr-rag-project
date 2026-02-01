/**
 * Typography constants for consistent text styling.
 */

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
};

export const typography = {
  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  h5: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },

  // Body
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Labels
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  labelSmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // Buttons
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  buttonSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // Caption
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
};

export default typography;
