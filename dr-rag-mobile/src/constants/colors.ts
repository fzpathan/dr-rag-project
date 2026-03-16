/**
 * ClinIQ — Dark premium color system.
 * Inspired by Linear, Raycast, Vercel.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────
  background:   '#07111f',   // Deep navy — main screen bg
  surface:      '#0c1829',   // Cards, modals
  surfaceHigh:  '#0f1f31',   // Elevated surfaces
  overlay:      'rgba(0,0,0,0.6)',

  // ── Primary — Teal ───────────────────────────────────────────
  primary: {
    50:  'rgba(13,148,136,0.08)',
    100: 'rgba(13,148,136,0.15)',
    200: 'rgba(13,148,136,0.25)',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#0d9488',   // Core brand teal
    600: '#0f766e',
    700: '#134e4a',
    800: '#042f2e',
    900: '#021a19',
  },

  // ── Accent — Cyan (gradient partner) ─────────────────────────
  accent: '#0891b2',
  accentLight: '#38bdf8',

  // ── Gradient stops ────────────────────────────────────────────
  gradientStart: '#0d9488',
  gradientEnd:   '#0891b2',

  // ── Text ─────────────────────────────────────────────────────
  textPrimary:   '#f0f6ff',
  textSecondary: '#64748b',
  textMuted:     '#1e3a52',
  textOnPrimary: '#ffffff',

  // ── Borders ───────────────────────────────────────────────────
  border:      'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(13,148,136,0.5)',
  borderLight: 'rgba(255,255,255,0.04)',

  // ── Glows (colored shadows) ───────────────────────────────────
  glowTeal:  'rgba(13,148,136,0.35)',
  glowCyan:  'rgba(8,145,178,0.25)',
  glowError: 'rgba(239,68,68,0.35)',

  // ── Semantic ─────────────────────────────────────────────────
  success:      '#22c55e',
  successLight: 'rgba(34,197,94,0.12)',
  warning:      '#f59e0b',
  warningLight: 'rgba(245,158,11,0.12)',
  error:        '#ef4444',
  errorLight:   'rgba(239,68,68,0.12)',
  info:         '#3b82f6',
  infoLight:    'rgba(59,130,246,0.12)',

  // ── Legacy aliases (keep existing components compiling) ───────
  card:          '#0c1829',
  neutral: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: 'rgba(255,255,255,0.07)',
    300: 'rgba(255,255,255,0.12)',
    400: '#475569',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// Dark Paper theme
export const paperTheme = {
  dark: true,
  colors: {
    primary:              colors.primary[500],
    primaryContainer:     colors.primary[100],
    secondary:            colors.accentLight,
    secondaryContainer:   'rgba(56,189,248,0.12)',
    surface:              colors.surface,
    surfaceVariant:       colors.surfaceHigh,
    background:           colors.background,
    error:                colors.error,
    errorContainer:       colors.errorLight,
    onPrimary:            colors.textOnPrimary,
    onPrimaryContainer:   colors.primary[300],
    onSecondary:          colors.textOnPrimary,
    onSecondaryContainer: colors.accentLight,
    onSurface:            colors.textPrimary,
    onSurfaceVariant:     colors.textSecondary,
    onError:              colors.textOnPrimary,
    onErrorContainer:     colors.error,
    onBackground:         colors.textPrimary,
    outline:              colors.border,
    outlineVariant:       colors.borderLight,
    inverseSurface:       '#f1f5f9',
    inverseOnSurface:     '#0f172a',
    inversePrimary:       colors.primary[500],
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceHigh,
      level3: colors.surfaceHigh,
      level4: colors.surfaceHigh,
      level5: colors.surfaceHigh,
    },
  },
};

export default colors;
