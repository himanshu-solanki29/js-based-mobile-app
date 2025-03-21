/**
 * Colors for Holistic Health Care app - Nature-inspired green theme
 */

const primaryGreen = '#2e7d32';  // Forest green
const secondaryGreen = '#4caf50';  // Leaf green
const accentGreen = '#81c784';  // Light mint
const earthTone = '#795548';  // Earthy brown

export const Colors = {
  light: {
    text: '#33691e',  // Dark green text
    background: '#f1f8e9',  // Very light mint background
    tint: primaryGreen,
    icon: '#558b2f',  // Medium green
    tabIconDefault: '#aed581',  // Light green
    tabIconSelected: primaryGreen,
    card: '#e8f5e9',  // Light green card background
    buttonBackground: secondaryGreen,
    buttonText: '#ffffff',
    headerBackground: accentGreen,
    accent: earthTone,
    // Status colors
    success: '#4CAF50',  // Green
    warning: '#FFC107',  // Yellow/Amber
    error: '#F44336',    // Red
    primary: primaryGreen,
  },
  dark: {
    text: '#c5e1a5',  // Light green text for dark mode
    background: '#1b5e20',  // Dark green background
    tint: accentGreen,
    icon: '#aed581',
    tabIconDefault: '#689f38',
    tabIconSelected: accentGreen,
    card: '#2e7d32',  // Darker green card background
    buttonBackground: secondaryGreen,
    buttonText: '#ffffff',
    headerBackground: '#33691e',
    accent: '#bcaaa4',  // Light earthy tone
    // Status colors
    success: '#4CAF50',  // Green
    warning: '#FFC107',  // Yellow/Amber
    error: '#F44336',    // Red
    primary: accentGreen,
  },
};
