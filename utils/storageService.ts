import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
   * Save data to storage
   */
  async saveData(data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.setItem(this.key, jsonValue);
        } else {
          // Use memory storage for SSR
          memoryStorage[this.key] = jsonValue;
        }
      } else {
        // Use AsyncStorage for native
        await AsyncStorage.setItem(this.key, jsonValue);
      }
    } catch (e) {
      console.error(`Error saving data to ${this.key}:`, e);
      throw e;
    }
  }
  
  /**
   * Get data from storage
   */
  async getData(): Promise<T | null> {
    try {
      let jsonValue: string | null;
      
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          jsonValue = window.localStorage.getItem(this.key);
        } else {
          // Use memory storage for SSR
          jsonValue = memoryStorage[this.key] || null;
        }
      } else {
        // Use AsyncStorage for native
        jsonValue = await AsyncStorage.getItem(this.key);
      }
      
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error(`Error reading data from ${this.key}:`, e);
      return null;
    }
  }
  
  /**
   * Remove data from storage
   */
  async removeData(): Promise<void> {
    try {
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.removeItem(this.key);
        } else {
          // Use memory storage for SSR
          delete memoryStorage[this.key];
        }
      } else {
        // Use AsyncStorage for native
        await AsyncStorage.removeItem(this.key);
      }
    } catch (e) {
      console.error(`Error removing data from ${this.key}:`, e);
      throw e;
    }
  }
  
  /**
   * Clear all data (use with caution)
   */
  async clearAllData(): Promise<void> {
    try {
      if (isWeb) {
        if (isBrowser) {
          // Use localStorage for web in browser
          window.localStorage.clear();
        } else {
          // Use memory storage for SSR
          Object.keys(memoryStorage).forEach(key => {
            delete memoryStorage[key];
          });
        }
      } else {
        // Use AsyncStorage for native
        await AsyncStorage.clear();
      }
    } catch (e) {
      console.error('Error clearing all data:', e);
      throw e;
    }
  }
}

export default StorageService; 