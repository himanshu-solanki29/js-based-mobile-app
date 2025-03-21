import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Check if the app is running on web platform
 */
const isWeb = Platform.OS === 'web';

/**
 * Storage service class that provides methods to interact with device storage
 * Uses AsyncStorage for mobile and localStorage for web
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
        // Use localStorage for web
        localStorage.setItem(this.key, jsonValue);
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
        // Use localStorage for web
        jsonValue = localStorage.getItem(this.key);
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
        // Use localStorage for web
        localStorage.removeItem(this.key);
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
        // Use localStorage for web
        localStorage.clear();
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