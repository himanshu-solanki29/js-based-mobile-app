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

// Class to handle dummy data operations
class DummyDataService {
  private initialPatientIds: string[] = [];
  private initialAppointmentIds: string[] = [];
  
  constructor() {
    // Store initial patient IDs (1-5)
    this.initialPatientIds = Object.keys(INITIAL_PATIENTS);
    
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
      
      // Default to true if setting doesn't exist
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error loading show dummy data setting:', error);
      // Default to true on error
      return true;
    }
  }
  
  // Set the setting
  async setShowDummyDataSetting(value: boolean): Promise<void> {
    try {
      const stringValue = value.toString();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      } else {
        await AsyncStorage.setItem(SHOW_DUMMY_DATA_KEY, stringValue);
      }
      
      // Apply the setting
      await this.applyDummyDataSetting(value);
    } catch (error) {
      console.error('Error setting show dummy data setting:', error);
      throw error;
    }
  }
  
  // Apply the setting (show or hide dummy data)
  async applyDummyDataSetting(showDummyData: boolean): Promise<void> {
    if (showDummyData) {
      await this.restoreDummyData();
    } else {
      await this.removeDummyData();
    }
  }
  
  // Remove all dummy data from storage
  private async removeDummyData(): Promise<void> {
    try {
      console.log('Removing dummy data');
      
      // Load current patient data
      const patientsData = await AsyncStorage.getItem(PATIENT_STORAGE_KEY);
      if (patientsData) {
        const patients = JSON.parse(patientsData);
        
        // Remove dummy patients
        const filteredPatients = {};
        Object.entries(patients).forEach(([id, patient]) => {
          if (!this.initialPatientIds.includes(id)) {
            filteredPatients[id] = patient;
          }
        });
        
        // Save filtered patients
        await AsyncStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(filteredPatients));
      }
      
      // Load current appointment data
      const appointmentsData = await AsyncStorage.getItem(APPOINTMENT_STORAGE_KEY);
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        
        // Remove dummy appointments
        const filteredAppointments = appointments.filter(
          appointment => !this.initialAppointmentIds.includes(appointment.id)
        );
        
        // Save filtered appointments
        await AsyncStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(filteredAppointments));
      }
      
      // Force the storage services to refresh their data
      setTimeout(() => {
        patientStorageService.initialize();
        appointmentStorageService.initialize();
      }, 0);
    } catch (error) {
      console.error('Error removing dummy data:', error);
      throw error;
    }
  }
  
  // Restore all dummy data to storage
  private async restoreDummyData(): Promise<void> {
    try {
      console.log('Restoring dummy data');
      
      // Load current patient data
      const patientsData = await AsyncStorage.getItem(PATIENT_STORAGE_KEY);
      if (patientsData) {
        const patients = JSON.parse(patientsData);
        
        // Merge with initial patients
        const mergedPatients = {
          ...patients
        };
        
        // Add back all initial patients that don't exist
        Object.entries(INITIAL_PATIENTS).forEach(([id, patient]) => {
          if (!mergedPatients[id]) {
            mergedPatients[id] = patient;
          }
        });
        
        // Save merged patients
        await AsyncStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(mergedPatients));
      } else {
        // If no patients exist, just use the initial data
        await AsyncStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
      }
      
      // Load current appointment data
      const appointmentsData = await AsyncStorage.getItem(APPOINTMENT_STORAGE_KEY);
      if (appointmentsData) {
        const appointments = JSON.parse(appointmentsData);
        
        // Get existing appointment IDs
        const existingIds = new Set(appointments.map(appointment => appointment.id));
        
        // Find initial appointments that don't exist
        const appointmentsToAdd = INITIAL_APPOINTMENTS.filter(
          appointment => !existingIds.has(appointment.id)
        );
        
        // Merge with existing
        const mergedAppointments = [
          ...appointments,
          ...appointmentsToAdd
        ];
        
        // Save merged appointments
        await AsyncStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(mergedAppointments));
      } else {
        // If no appointments exist, just use the initial data
        await AsyncStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
      }
      
      // Force the storage services to refresh their data
      setTimeout(() => {
        patientStorageService.initialize();
        appointmentStorageService.initialize();
      }, 0);
    } catch (error) {
      console.error('Error restoring dummy data:', error);
      throw error;
    }
  }
}

const dummyDataService = new DummyDataService();
export default dummyDataService; 