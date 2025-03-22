import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Add error logging to key methods
class AppointmentStorageService {
  // ... existing code ...
  
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
      // ... existing code ...
      return newAppointment;
    } catch (error) {
      logStorageError('addAppointment', error);
      throw error;
    }
  }
  
  async bulkAddAppointments(appointmentsArray) {
    try {
      await this.ensureInitialized();
      // ... existing code ...
    } catch (error) {
      logStorageError('bulkAddAppointments', error);
      throw error;
    }
  }
  
  // ... existing code ...
} 