import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { GlobalToastProvider } from "@/components/GlobalToastProvider";
import { initializeStorage } from '@/utils/initializeStorage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Create the Paper theme
  const paperLightTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#4CAF50',
      secondary: '#8BC34A',
    },
  };

  const paperDarkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#66BB6A',
      secondary: '#9CCC65',
    },
  };

  // Create the Navigation theme
  const navigationLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#4CAF50',
      background: '#F8F9FA',
      card: '#FFFFFF',
      text: '#212121',
    },
  };

  const navigationDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#66BB6A',
      background: '#121212',
      card: '#1E1E1E',
      text: '#FFFFFF',
    },
  };

  // Select theme based on color scheme
  const paperTheme = colorScheme === 'dark' ? paperDarkTheme : paperLightTheme;
  const navigationTheme = colorScheme === 'dark' ? navigationDarkTheme : navigationLightTheme;

  // Initialize storage when the app loads
  useEffect(() => {
    const setupStorage = async () => {
      try {
        await initializeStorage();
        console.log('Storage initialized successfully');
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };

    setupStorage();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navigationTheme}>
          <GlobalToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </GlobalToastProvider>
        </ThemeProvider>
        <StatusBar style="auto" />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
