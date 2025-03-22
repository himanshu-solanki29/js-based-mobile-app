import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestStoragePermissions, checkStoragePermissions } from '../app/runtime-permissions';

/**
 * Check if the app is running on web platform
 */
const isWeb = Platform.OS === 'web';

/**
 * Check if we're in a browser environment where localStorage is available
 */
const isBrowser = isWeb && typeof window !== 'undefined' && window.localStorage;

/**
 * Memory fallback for server-side rendering
 */
const memoryStorage: Record<string, string> = {};

/**
 * Storage service class that provides methods to interact with device storage
 * Uses AsyncStorage for mobile, localStorage for web, and memory for SSR
 */
class StorageService<T> {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  /**
   * Check and request storage permissions on Android if needed
   */
  private async ensurePermissions(): Promise<boolean> {
    // Only needed for Android < 10 (API level 29)
    if (Platform.OS !== 'android' || Platform.Version >= 29) {
      return true;
    }
    
    try {
      // Check if we already have permissions
      const hasPermissions = await checkStoragePermissions();
      if (hasPermissions) {
        return true;
      }
      
      // Request permissions if needed
      const granted = await requestStoragePermissions();
      if (!granted) {
        console.error(`Storage permissions not granted for key: ${this.key}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error ensuring permissions for key ${this.key}:`, error);
      return false;
    }
  }
  
  /**
   * Save data to storage
   */
  async saveData(data: T): Promise<void> {
    try {
      // Check permissions first on Android < 10
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error(`Storage permissions denied for key: ${this.key}`);
          throw new Error('Storage permissions are required');
        }
      }
      
      const jsonValue = JSON.stringify(data);
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.setItem(this.key, jsonValue);
          console.log(`Saved data to localStorage for key: ${this.key}`);
        } else {
          // Use memory storage for SSR
          memoryStorage[this.key] = jsonValue;
          console.log(`Saved data to memory storage for key: ${this.key}`);
        }
      } else {
        // Use AsyncStorage for mobile
        try {
          await AsyncStorage.setItem(this.key, jsonValue);
          console.log(`Saved data to AsyncStorage for key: ${this.key}`);
        } catch (asyncStorageError) {
          console.error(`AsyncStorage error for key ${this.key}:`, asyncStorageError);
          throw new Error(`AsyncStorage error: ${asyncStorageError.message}`);
        }
      }
    } catch (error) {
      console.error(`Error saving data for key ${this.key}:`, error);
      throw error;
    }
  }
  
  /**
   * Get data from storage
   */
  async getData(): Promise<T | null> {
    try {
      // Check permissions first on Android < 10
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error(`Storage permissions denied for key: ${this.key}`);
          throw new Error('Storage permissions are required');
        }
      }
      
      let jsonValue: string | null;
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          jsonValue = window.localStorage.getItem(this.key);
          console.log(`Retrieved data from localStorage for key: ${this.key}`);
        } else {
          // Use memory storage for SSR
          jsonValue = memoryStorage[this.key] || null;
          console.log(`Retrieved data from memory storage for key: ${this.key}`);
        }
      } else {
        // Use AsyncStorage for mobile
        try {
          jsonValue = await AsyncStorage.getItem(this.key);
          console.log(`Retrieved data from AsyncStorage for key: ${this.key}, exists: ${!!jsonValue}`);
        } catch (asyncStorageError) {
          console.error(`AsyncStorage error retrieving key ${this.key}:`, asyncStorageError);
          throw new Error(`AsyncStorage error: ${asyncStorageError.message}`);
        }
      }
      
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading data from ${this.key}:`, error);
      // On permission errors, return null to avoid blocking the app
      return null;
    }
  }
  
  /**
   * Remove data from storage
   */
  async removeData(): Promise<void> {
    try {
      // Check permissions first on Android < 10
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error(`Storage permissions denied for key: ${this.key}`);
          throw new Error('Storage permissions are required');
        }
      }
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.removeItem(this.key);
          console.log(`Removed data from localStorage for key: ${this.key}`);
        } else {
          // Use memory storage for SSR
          delete memoryStorage[this.key];
          console.log(`Removed data from memory storage for key: ${this.key}`);
        }
      } else {
        // Use AsyncStorage for native
        try {
          await AsyncStorage.removeItem(this.key);
          console.log(`Removed data from AsyncStorage for key: ${this.key}`);
        } catch (asyncStorageError) {
          console.error(`AsyncStorage error removing key ${this.key}:`, asyncStorageError);
          throw new Error(`AsyncStorage error: ${asyncStorageError.message}`);
        }
      }
    } catch (error) {
      console.error(`Error removing data from ${this.key}:`, error);
      throw error;
    }
  }
  
  /**
   * Clear all data (use with caution)
   */
  async clearAllData(): Promise<void> {
    try {
      // Check permissions first on Android < 10
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error('Storage permissions denied for clearAllData');
          throw new Error('Storage permissions are required');
        }
      }
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.clear();
          console.log('Cleared all data from localStorage');
        } else {
          // Use memory storage for SSR
          Object.keys(memoryStorage).forEach(key => {
            delete memoryStorage[key];
          });
          console.log('Cleared all data from memory storage');
        }
      } else {
        // Use AsyncStorage for native
        try {
          await AsyncStorage.clear();
          console.log('Cleared all data from AsyncStorage');
        } catch (asyncStorageError) {
          console.error('AsyncStorage error clearing all data:', asyncStorageError);
          throw new Error(`AsyncStorage error: ${asyncStorageError.message}`);
        }
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

export default StorageService; 