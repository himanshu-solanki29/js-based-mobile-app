import { useEffect, useState } from 'react';
import { ColorSchemeName } from 'react-native';

/**
 * To support static rendering and always use light theme
 */
export function useColorScheme(): NonNullable<ColorSchemeName> {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return 'light';
}
