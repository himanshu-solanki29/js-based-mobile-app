import patientStorageService from './patientStorageService';
import appointmentStorageService from './appointmentStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Check if running on web
const isWeb = Platform.OS === 'web';

// Check if we're in a browser environment where localStorage is available
const isBrowser = isWeb && typeof window !== 'undefined' && window.localStorage;

// Memory fallback for server-side rendering
const memoryStorage: Record<string, string> = {};

// Function to check if this is the first app launch
const isFirstLaunch = async (): Promise<boolean> => {
  try {
    const APP_FIRST_LAUNCH_KEY = '@app_first_launch';
    let value: string | null;
    
    if (isWeb) {
      if (isBrowser) {
        // Use localStorage on web in browser
        value = window.localStorage.getItem(APP_FIRST_LAUNCH_KEY);
      } else {
        // Use memory storage for SSR
        value = memoryStorage[APP_FIRST_LAUNCH_KEY] || null;
      }
    } else {
      // Use AsyncStorage on native
      value = await AsyncStorage.getItem(APP_FIRST_LAUNCH_KEY);
    }
    
    return value === null; // If null, this is the first launch
  } catch (error) {
    console.error('Error checking first launch status:', error);
    return true; // Default to first launch if there's an error
  }
};

// Function to mark app as launched
const markAsLaunched = async (): Promise<void> => {
  try {
    const APP_FIRST_LAUNCH_KEY = '@app_first_launch';
    
    if (isWeb) {
      if (isBrowser) {
        // Use localStorage on web in browser
        window.localStorage.setItem(APP_FIRST_LAUNCH_KEY, 'false');
      } else {
        // Use memory storage for SSR
        memoryStorage[APP_FIRST_LAUNCH_KEY] = 'false';
      }
    } else {
      // Use AsyncStorage on native
      await AsyncStorage.setItem(APP_FIRST_LAUNCH_KEY, 'false');
    }
  } catch (error) {
    console.error('Error marking app as launched:', error);
  }
};

// Initialize storage with default data if needed
export const initializeStorage = async (forceReset: boolean = false): Promise<void> => {
  try {
    // Check if this is the first launch
    const firstLaunch = await isFirstLaunch();

    if (firstLaunch || forceReset) {
      console.log(forceReset ? 'Force reset requested' : 'First launch detected', 'initializing storage');
      
      if (forceReset) {
        // Re-initialize storage services
        await patientStorageService.reset();
        await appointmentStorageService.reset();
      }

      // Mark as launched so we don't initialize again
      await markAsLaunched();
    } else {
      console.log('Storage already initialized from previous launch');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

export default initializeStorage; 