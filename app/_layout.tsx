import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Adapt the navigation themes to work with Paper
  const { LightTheme: NavigationLightTheme, DarkTheme: NavigationDarkTheme } = adaptNavigationTheme({
    reactNavigationLight: DefaultTheme,
    reactNavigationDark: DarkTheme,
  });

  // Create custom Paper themes for light and dark modes with complete color mapping
  const lightTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      // Primary and accent colors
      primary: Colors.light.tint,
      primaryContainer: Colors.light.success,
      secondaryContainer: Colors.light.warning,
      tertiaryContainer: Colors.light.primary,
      // Surface colors
      background: Colors.light.background,
      surface: Colors.light.card,
      surfaceVariant: Colors.light.card,
      // Error colors
      error: Colors.light.error,
      errorContainer: Colors.light.error,
      // Text and icon colors
      onPrimary: Colors.light.buttonText,
      onBackground: Colors.light.text,
      onSurface: Colors.light.text,
      outline: Colors.light.icon,
    },
  };

  const darkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      // Primary and accent colors
      primary: Colors.dark.tint,
      primaryContainer: Colors.dark.success,
      secondaryContainer: Colors.dark.warning,
      tertiaryContainer: Colors.dark.primary,
      // Surface colors
      background: Colors.dark.background,
      surface: Colors.dark.card,
      surfaceVariant: Colors.dark.card,
      // Error colors
      error: Colors.dark.error,
      errorContainer: Colors.dark.error,
      // Text and icon colors
      onPrimary: Colors.dark.buttonText,
      onBackground: Colors.dark.text,
      onSurface: Colors.dark.text,
      outline: Colors.dark.icon,
    },
  };

  // Select theme based on color scheme
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
