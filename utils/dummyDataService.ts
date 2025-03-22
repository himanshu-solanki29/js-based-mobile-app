import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { INITIAL_PATIENTS } from './initialData';
import { INITIAL_APPOINTMENTS } from './initialData';
import patientStorageService from './patientStorageService';
import appointmentStorageService from './appointmentStorageService';

// Constants
export const SHOW_DUMMY_DATA_KEY = '@app_config_show_dummy_data';
const PATIENT_STORAGE_KEY = 'patients_data';
const APPOINTMENT_STORAGE_KEY = 'appointments_data';

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
  private initialPatientIds: string[] = [];
  private initialAppointmentIds: string[] = [];
  
  constructor() {
    // Store initial patient IDs (1-5)
    this.initialPatientIds = Object.keys(INITIAL_PATIENTS).map(id => id);
    
    // Store initial appointment IDs (1-7)
    this.initialAppointmentIds = INITIAL_APPOINTMENTS.map(appointment => appointment.id);
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
      
      // Default to false if setting doesn't exist
      return value === null ? false : value === 'true';
    } catch (error) {
      console.error('Error loading show dummy data setting:', error);
      // Default to false on error
      return false;
    }
  }
  
  // Set the setting without applying changes (for imported settings)
  async setShowDummyDataSetting(enabled: boolean): Promise<void> {
    try {
      console.log(`Setting dummy data setting to: ${enabled}`);
      
      // Store the setting
      const stringValue = enabled.toString();
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
      console.log(`Toggling dummy data to: ${enabled}`);
      
      // Store the setting
      const stringValue = enabled.toString();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      } else {
        await AsyncStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      }
      
      // Apply the change
      if (enabled) {
        await this.addDummyData();
      } else {
        await this.removeDummyData();
      }
      
      // Notify all screens to refresh
      globalEventEmitter.emit('DUMMY_DATA_CHANGED');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error toggling dummy data:', error);
      return Promise.reject(error);
    }
  }
  
  // Add dummy data to stores
  private async addDummyData(): Promise<void> {
    try {
      console.log('Adding dummy data to stores');
      
      // First, ensure we remove any existing dummy data to prevent duplicates
      await this.removeDummyData();
      
      // Add dummy patients
      const patientsToAdd = {};
      Object.entries(INITIAL_PATIENTS).forEach(([id, patient]) => {
        patientsToAdd[id] = patient;
      });
      
      await patientStorageService.bulkAddPatients(patientsToAdd);
      
      // Add dummy appointments
      await appointmentStorageService.bulkAddAppointments(INITIAL_APPOINTMENTS);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding dummy data:', error);
      return Promise.reject(error);
    }
  }
  
  // Remove dummy data from stores
  private async removeDummyData(): Promise<void> {
    try {
      console.log('Removing dummy data from stores');
      
      // Remove dummy patients
      for (const id of this.initialPatientIds) {
        await patientStorageService.deletePatient(id);
      }
      
      // Remove dummy appointments
      for (const id of this.initialAppointmentIds) {
        await appointmentStorageService.deleteAppointment(id);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing dummy data:', error);
      return Promise.reject(error);
    }
  }
  
  // Check for and initialize dummy data if needed
  async initializeDummyData(): Promise<void> {
    try {
      const showDummyData = await this.getShowDummyDataSetting();
      
      if (showDummyData) {
        await this.addDummyData();
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing dummy data:', error);
      return Promise.reject(error);
    }
  }
}

const dummyDataService = new DummyDataService();
export default dummyDataService; 