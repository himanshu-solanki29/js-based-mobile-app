import patientStorageService from './patientStorageService';
import appointmentStorageService from './appointmentStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Constants
const FIRST_LAUNCH_KEY = '@app_first_launch';

/**
 * Check if this is the first time the app is being launched
 */
export const isFirstLaunch = async (): Promise<boolean> => {
  try {
    let value;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      value = localStorage.getItem(FIRST_LAUNCH_KEY);
    } else {
      value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    }
    return value === null; // First launch if the key doesn't exist
  } catch (error) {
    console.error('Error checking if first launch:', error);
    return false; // Assume not first launch on error
  }
};

/**
 * Mark the app as launched to prevent re-initialization on subsequent runs
 */
export const markAsLaunched = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem(FIRST_LAUNCH_KEY, 'false');
    } else {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
    }
  } catch (error) {
    console.error('Error marking app as launched:', error);
  }
};

/**
 * Initialize storage services, possibly with a forced reset
 */
export const initializeStorage = async (forceReset: boolean = false): Promise<void> => {
  try {
    // Check if this is the first launch
    const firstLaunch = await isFirstLaunch();
    
    if (firstLaunch || forceReset) {
      console.log('First launch or forced reset. Initializing with empty data...');
      
      // Reset storage to empty state
      await patientStorageService.reset();
      await appointmentStorageService.reset();
      
      // Mark as launched
      await markAsLaunched();
    } else {
      console.log('Not first launch. Using existing data.');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}; 