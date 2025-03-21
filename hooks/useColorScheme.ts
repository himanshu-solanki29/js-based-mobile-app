import { ColorSchemeName } from 'react-native';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  // Always return 'light' for a light theme
  return 'light';
}
