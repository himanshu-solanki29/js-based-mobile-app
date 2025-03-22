import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestStoragePermissions, checkStoragePermissions } from '../runtime-permissions';

/**
 * Base storage service that handles platform-specific storage operations
 */
export default class StorageService {
  /**
   * Create a new storage service
   * @param {string} storageKey The key to use for storage
   */
  constructor(storageKey) {
    this.storageKey = storageKey;
  }
  
  /**
   * Check and request Android permissions if needed
   * @returns {Promise<boolean>} True if permissions are granted
   */
  async ensurePermissions() {
    // Only check permissions on Android
    if (Platform.OS !== 'android') {
      return true;
    }
    
    // Check if we have storage permissions
    const hasPermissions = await checkStoragePermissions();
    if (hasPermissions) {
      return true;
    }
    
    // Request permissions if we don't have them
    return await requestStoragePermissions();
  }
  
  /**
   * Get data from storage
   * @returns {Promise<any>} The stored data, or null if no data exists
   */
  async getData() {
    try {
      // Ensure we have permissions on Android
      if (Platform.OS === 'android') {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error('Storage permissions denied');
          throw new Error('Storage permissions are required');
        }
      }
      
      let storedData;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        storedData = localStorage.getItem(this.storageKey);
      } else {
        storedData = await AsyncStorage.getItem(this.storageKey);
      }
      
      if (!storedData) {
        return null;
      }
      
      return JSON.parse(storedData);
    } catch (error) {
      console.error(`Error getting data for ${this.storageKey}:`, error);
      return null;
    }
  }
  
  /**
   * Save data to storage
   * @param {any} data The data to save
   * @returns {Promise<boolean>} True if the operation succeeded, false otherwise
   */
  async saveData(data) {
    try {
      // Ensure we have permissions on Android
      if (Platform.OS === 'android') {
        const hasPermissions = await this.ensurePermissions();
        if (!hasPermissions) {
          console.error('Storage permissions denied');
          throw new Error('Storage permissions are required');
        }
      }
      
      const jsonData = JSON.stringify(data);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, jsonData);
      } else {
        await AsyncStorage.setItem(this.storageKey, jsonData);
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving data for ${this.storageKey}:`, error);
      return false;
    }
  }
  
  /**
   * Clear data from storage
   * @returns {Promise<boolean>} True if the operation succeeded, false otherwise
   */
  async clearData() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      } else {
        await AsyncStorage.removeItem(this.storageKey);
      }
      
      return true;
    } catch (error) {
      console.error(`Error clearing data for ${this.storageKey}:`, error);
      return false;
    }
  }
} 