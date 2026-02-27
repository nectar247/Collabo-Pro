export const Colors = {
  primary: '#2563EB',        // Blue — trust, security
  primaryDark: '#1D4ED8',
  secondary: '#7C3AED',      // Purple — creativity, collaboration
  accent: '#10B981',         // Green — active, success
  danger: '#EF4444',
  warning: '#F59E0B',

  background: '#0F172A',     // Dark navy
  surface: '#1E293B',
  surfaceHigh: '#334155',
  border: '#475569',

  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 30,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
