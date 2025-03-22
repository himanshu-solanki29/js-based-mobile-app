import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import patientStorageService from './patientStorageService';
import appointmentStorageService from './appointmentStorageService';

// Constants
export const SHOW_DUMMY_DATA_KEY = '@app_config_show_dummy_data';

// Create a simple event system for screen refreshing
type EventListener = () => void;

export class EventEmitter {
  private listeners: Record<string, EventListener[]> = {};

  addListener(event: string, callback: EventListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeListener(event: string, callback: EventListener): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback());
  }
}

// Global event emitter instance
export const globalEventEmitter = new EventEmitter();

// Class to handle dummy data operations
class DummyDataService {
  
  constructor() {
    // No initialization needed
  }
  
  // Get the current setting
  async getShowDummyDataSetting(): Promise<boolean> {
    try {
      let value;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        value = localStorage.getItem(SHOW_DUMMY_DATA_KEY);
      } else {
        value = await AsyncStorage.getItem(SHOW_DUMMY_DATA_KEY);
      }
      
      // Default to false always
      return false;
    } catch (error) {
      console.error('Error loading show dummy data setting:', error);
      // Default to false on error
      return false;
    }
  }
  
  // Set the setting without applying changes (for imported settings)
  async setShowDummyDataSetting(enabled: boolean): Promise<void> {
    try {
      console.log('Dummy data functionality has been deprecated');
      
      // Store the setting as false (disabling dummy data)
      const stringValue = 'false';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      } else {
        await AsyncStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error setting dummy data setting:', error);
      return Promise.reject(error);
    }
  }
  
  // Set the setting and apply changes
  async toggleDummyData(enabled: boolean): Promise<void> {
    try {
      console.log('Dummy data functionality has been deprecated');
      
      // Store the setting as false (disabling dummy data)
      const stringValue = 'false';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      } else {
        await AsyncStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      }
      
      // Notify all screens to refresh
      globalEventEmitter.emit('DUMMY_DATA_CHANGED');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error toggling dummy data:', error);
      return Promise.reject(error);
    }
  }
  
  // Placeholder for backward compatibility, does nothing
  async initializeDummyData(): Promise<void> {
    console.log('Dummy data functionality has been deprecated');
    return Promise.resolve();
  }
}

const dummyDataService = new DummyDataService();
export default dummyDataService; 