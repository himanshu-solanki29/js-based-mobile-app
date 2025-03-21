import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, Snackbar } from 'react-native-paper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform, View, Text } from "react-native";
import { GlobalToastProvider } from "@/components/GlobalToastProvider";
import { initializeStorage } from '@/utils/initializeStorage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(error => {
  console.warn("Error preventing splash screen auto-hide:", error);
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

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
        setStorageInitialized(true);
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setInitError(`Storage initialization failed: ${errorMessage}`);
        // Still mark as initialized so app can proceed even with error
        setStorageInitialized(true);
      }
    };

    setupStorage();
  }, []);

  // Hide splash screen when loaded
  useEffect(() => {
    if (loaded && storageInitialized) {
      SplashScreen.hideAsync().catch(error => {
        console.warn("Error hiding splash screen:", error);
      });
    }
  }, [loaded, storageInitialized]);

  // Show loading if not ready
  if (!loaded || !storageInitialized) {
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
            
            {initError && (
              <Snackbar
                visible={!!initError}
                onDismiss={() => setInitError(null)}
                action={{
                  label: 'Dismiss',
                  onPress: () => setInitError(null),
                }}
                style={{ backgroundColor: '#D32F2F' }}
              >
                <Text style={{ color: 'white' }}>{initError}</Text>
              </Snackbar>
            )}
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
