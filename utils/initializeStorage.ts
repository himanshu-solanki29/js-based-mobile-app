import patientStorageService from './patientStorageService';
import appointmentStorageService from './appointmentStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to check if this is the first app launch
const isFirstLaunch = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem('@app_first_launch');
    return value === null; // If null, this is the first launch
  } catch (error) {
    console.error('Error checking first launch status:', error);
    return true; // Default to first launch if there's an error
  }
};

// Function to mark app as launched
const markAsLaunched = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('@app_first_launch', 'false');
  } catch (error) {
    console.error('Error marking app as launched:', error);
  }
};

// Initialize storage with default data if needed
export const initializeStorage = async (): Promise<void> => {
  try {
    // Check if this is the first launch
    const firstLaunch = await isFirstLaunch();

    if (firstLaunch) {
      console.log('First launch detected, initializing storage with default data');
      
      // The storage services will load initial data if none exists
      // This is handled in their constructors
      
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