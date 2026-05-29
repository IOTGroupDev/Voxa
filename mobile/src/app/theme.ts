import { StyleSheet } from 'react-native';

export const palette = {
  // Primary gradient: deep indigo to violet
  background: '#0f0e18',
  backgroundSoft: '#1a1828',
  surface: '#18161f',
  surfaceSoft: '#22202d',
  surfaceLighter: '#2d2939',
  
  // Borders with subtle glow
  border: '#3d3a4d',
  borderLight: '#4a4759',
  highlight: '#a78bfa',
  
  // Text hierarchy
  text: '#f5f3ff',
  textSecondary: '#c4b5fd',
  muted: '#9a96b0',
  
  // Accent: vibrant gradient capable
  accent: '#7c3aed',
  accentLight: '#c084fc',
  accentStrong: '#5b21b6',
  accentGlow: '#a78bfa',
  
  // Semantic colors
  success: '#10b981',
  danger: '#f87171',
  info: '#06b6d4',
  warning: '#fbbf24',
  
  // Overlay & transparent
  overlay: 'rgba(15, 14, 24, 0.8)',
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const shadow = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 15,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export const typography = {
  h1: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  xs: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
};
