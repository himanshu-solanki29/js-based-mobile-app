import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// List of dummy appointment IDs (1-7) to avoid collisions
const DUMMY_APPOINTMENT_IDS = ['1', '2', '3', '4', '5', '6', '7'];
const APPOINTMENTS_STORAGE_KEY = 'appointments';

// Helper function to log errors that might be happening during storage operations
const logStorageError = (operation, error) => {
  const errorMsg = error?.message || 'Unknown error';
  const errorDetails = {
    operation: `appointment_${operation}`,
    message: errorMsg,
    stack: error?.stack,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  };
  
  console.error(`Appointment storage error during ${operation}:`, errorDetails);
  
  // Save error to debug logs
  try {
    AsyncStorage.getItem('debug_logs').then(logsStr => {
      const logs = logsStr ? JSON.parse(logsStr) : [];
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `Appointment storage error during ${operation}`,
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

class AppointmentStorageService {
  constructor() {
    this.appointments = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      await this.loadAppointments();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize appointment storage:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    return this.initialized;
  }

  async loadAppointments() {
    try {
      let storedAppointments = [];
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
        storedAppointments = stored ? JSON.parse(stored) : [];
      } else {
        const stored = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
        storedAppointments = stored ? JSON.parse(stored) : [];
      }
      
      this.appointments = storedAppointments;
      return storedAppointments;
    } catch (error) {
      logStorageError('loadAppointments', error);
      console.error('Error loading appointments:', error);
      return [];
    }
  }

  async saveAppointments() {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(this.appointments));
      } else {
        await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(this.appointments));
      }
      
      return true;
    } catch (error) {
      logStorageError('saveAppointments', error);
      console.error('Error saving appointments:', error);
      return false;
    }
  }

  async getAppointments() {
    try {
      await this.ensureInitialized();
      return [...this.appointments];
    } catch (error) {
      logStorageError('getAppointments', error);
      throw error;
    }
  }

  async addAppointment(appointmentData) {
    try {
      await this.ensureInitialized();
      
      // Generate a new ID without referencing dummy data
      const existingIds = this.appointments.map(a => a.id);
      let newId;
      
      // Start with the next available number
      let idToTry = 1;
      while (existingIds.includes(idToTry.toString())) {
        idToTry++;
      }
      newId = idToTry.toString();
      
      // Create a new appointment object with the generated ID
      const newAppointment = {
        ...appointmentData,
        id: newId
      };
      
      // Log appointment creation for debugging
      console.log(`Creating new appointment with ID: ${newId}`);
      
      // Add the appointment
      this.appointments.push(newAppointment);
      
      // Save to storage
      await this.saveAppointments();
      
      return newAppointment;
    } catch (error) {
      logStorageError('addAppointment', error);
      console.error('Error adding appointment:', error);
      throw error;
    }
  }

  async bulkAddAppointments(appointmentsArray) {
    try {
      await this.ensureInitialized();
      
      // Add all appointments
      this.appointments = [...this.appointments, ...appointmentsArray];
      
      // Save to storage
      await this.saveAppointments();
      
      return true;
    } catch (error) {
      logStorageError('bulkAddAppointments', error);
      console.error('Error bulk adding appointments:', error);
      throw error;
    }
  }

  async updateAppointment(appointment) {
    await this.ensureInitialized();
    
    // Find the index of the appointment
    const index = this.appointments.findIndex(a => a.id === appointment.id);
    
    if (index === -1) {
      return null;
    }
    
    // Update the appointment
    this.appointments[index] = appointment;
    
    // Save to storage
    await this.saveAppointments();
    
    return appointment;
  }

  async deleteAppointment(id) {
    await this.ensureInitialized();
    
    // Filter out the appointment to delete
    this.appointments = this.appointments.filter(a => a.id !== id);
    
    // Save to storage
    return await this.saveAppointments();
  }
}

// Create a singleton instance
const appointmentStorageService = new AppointmentStorageService();
export default appointmentStorageService; 