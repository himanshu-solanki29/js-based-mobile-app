import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestStoragePermissions, checkStoragePermissions } from '../runtime-permissions';

const PATIENT_STORAGE_KEY = 'patients';
// List of dummy patient IDs (1-5) to avoid collisions
const DUMMY_PATIENT_IDS = ['1', '2', '3', '4', '5'];

// Helper function to log errors that might be happening during storage operations
const logStorageError = (operation, error) => {
  const errorMsg = error?.message || 'Unknown error';
  const errorDetails = {
    operation,
    message: errorMsg,
    stack: error?.stack,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  };
  
  console.error(`Storage error during ${operation}:`, errorDetails);
  
  // Save error to debug logs
  try {
    AsyncStorage.getItem('debug_logs').then(logsStr => {
      const logs = logsStr ? JSON.parse(logsStr) : [];
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `Storage error during ${operation}`,
        details: errorDetails
      });
      
      // Keep only last 100 logs
      const trimmedLogs = logs.slice(0, 100);
      AsyncStorage.setItem('debug_logs', JSON.stringify(trimmedLogs));
    }).catch(e => console.error('Error saving to debug logs:', e));
  } catch (logError) {
    console.error('Error logging storage error:', logError);
  }
};

class PatientStorageService {
  constructor() {
    this.patients = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Check and request Android permissions if needed
    if (Platform.OS === 'android') {
      const hasPermissions = await checkStoragePermissions();
      if (!hasPermissions) {
        const granted = await requestStoragePermissions();
        if (!granted) {
          console.error('Storage permissions denied');
          throw new Error('Storage permissions are required');
        }
      }
    }

    try {
      await this.loadPatients();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize patient storage:', error);
      throw error;
    }
  }

  async loadPatients() {
    try {
      let storedPatients;
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(PATIENT_STORAGE_KEY);
        storedPatients = stored ? JSON.parse(stored) : {};
      } else {
        const stored = await AsyncStorage.getItem(PATIENT_STORAGE_KEY);
        storedPatients = stored ? JSON.parse(stored) : {};
      }
      
      this.patients = storedPatients;
      return storedPatients;
    } catch (error) {
      logStorageError('loadPatients', error);
      console.error('Error loading patients:', error);
      return {};
    }
  }

  async savePatients() {
    try {
      if (Platform.OS === 'android') {
        // Check permissions before saving on Android
        const hasPermissions = await checkStoragePermissions();
        if (!hasPermissions) {
          const granted = await requestStoragePermissions();
          if (!granted) {
            console.error('Storage permissions denied');
            throw new Error('Storage permissions are required');
          }
        }
      }
      
      if (Platform.OS === 'web') {
        localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(this.patients));
      } else {
        await AsyncStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(this.patients));
      }
      
      return true;
    } catch (error) {
      logStorageError('savePatients', error);
      console.error('Error saving patients:', error);
      return false;
    }
  }

  async getPatients() {
    if (!this.initialized) {
      await this.init();
    }
    
    return Object.values(this.patients);
  }

  async addPatient(patient) {
    try {
      if (!this.initialized) {
        await this.init();
      }
      
      // Generate a new ID that avoids dummy data collisions (IDs 1-5)
      const existingIds = Object.keys(this.patients);
      let newId;
      
      // Start ID from 6 onwards to avoid collision with dummy data
      let idToTry = 6;
      do {
        newId = idToTry.toString();
        idToTry++;
      } while (existingIds.includes(newId) || DUMMY_PATIENT_IDS.includes(newId));
      
      // Create a new patient object with the generated ID
      const patientWithId = {
        ...patient,
        id: newId
      };
      
      this.patients[newId] = patientWithId;
      
      // Log patient creation for debugging
      console.log(`Creating new patient with ID: ${newId}`);
      
      const success = await this.savePatients();
      return success ? patientWithId : null;
    } catch (error) {
      logStorageError('addPatient', error);
      console.error('Error adding patient:', error);
      throw error;
    }
  }

  async updatePatient(patient) {
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.patients[patient.id]) {
      return null;
    }
    
    this.patients[patient.id] = patient;
    
    const success = await this.savePatients();
    return success ? patient : null;
  }

  async deletePatient(patientId) {
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.patients[patientId]) {
      return false;
    }
    
    delete this.patients[patientId];
    
    return await this.savePatients();
  }

  async bulkAddPatients(patientsObj) {
    if (!this.initialized) {
      await this.init();
    }
    
    this.patients = {
      ...this.patients,
      ...patientsObj
    };
    
    return await this.savePatients();
  }

  async clearAllPatients() {
    this.patients = {};
    return await this.savePatients();
  }
}

// Create singleton instance
const patientStorageService = new PatientStorageService();
export default patientStorageService; 