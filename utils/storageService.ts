import AsyncStorage from '@react-native-async-storage/async-storage';

// Base class for all storage services
class StorageService<T> {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  // Save data to storage
  async saveData(data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(this.key, jsonValue);
    } catch (e) {
      console.error(`Error saving data to ${this.key}:`, e);
      throw e;
    }
  }
  
  // Get data from storage
  async getData(): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(this.key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error(`Error reading data from ${this.key}:`, e);
      return null;
    }
  }
  
  // Remove data from storage
  async removeData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.key);
    } catch (e) {
      console.error(`Error removing data from ${this.key}:`, e);
      throw e;
    }
  }
  
  // Clear all data (use with caution)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('Error clearing all data:', e);
      throw e;
    }
  }
}

export default StorageService; 