import { StyleSheet, View, TouchableOpacity, Alert, Platform, ScrollView, Modal as RNModal } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect } from 'react';
import { Switch, Surface, Divider, Button, Portal, Modal, Dialog, Paragraph, Menu, IconButton } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { getPatientsArray } from '@/utils/patientStore';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import patientStorageService from '@/utils/patientStorageService';
import appointmentStorageService from '@/utils/appointmentStorageService';
import { initializeStorage } from '@/utils/initializeStorage';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import type { ToastType } from '@/components/Toast';
import StorageService from '@/utils/storageService';
import dummyDataService from '@/utils/dummyDataService';
import { INITIAL_PATIENTS, INITIAL_APPOINTMENTS } from '@/utils/initialData';

// Log storage service
const LOG_STORAGE_KEY = 'operation_logs';

// Constants
const SHOW_DUMMY_DATA_KEY = '@app_config_show_dummy_data';

// Log entry type
type LogEntry = {
  id: string;
  timestamp: string;
  operation: 'import' | 'export' | 'clear';
  status: 'success' | 'error' | 'warning';
  details: string;
};

// Log storage service
class LogStorageService extends StorageService<LogEntry[]> {
  private logs: LogEntry[] = [];
  
  constructor() {
    super(LOG_STORAGE_KEY);
    this.loadLogs().catch(err => {
      console.error('Failed to load logs:', err);
    });
  }
  
  async loadLogs() {
    const storedLogs = await this.getData();
    this.logs = storedLogs || [];
  }
  
  async getLogs(): Promise<LogEntry[]> {
    if (this.logs.length === 0) {
      await this.loadLogs();
    }
    return [...this.logs];
  }
  
  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    // Create a new log entry with id and timestamp
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    // Add to local logs
    this.logs = [newLog, ...this.logs].slice(0, 100); // Keep only last 100 logs
    
    // Save to storage
    await this.saveData(this.logs);
  }
  
  async clearLogs(): Promise<void> {
    this.logs = [];
    await this.saveData(this.logs);
  }
}

// Create an instance of the log service
const logStorageService = new LogStorageService();

// Helper function to convert JSON to CSV string
const jsonToCSV = (jsonData) => {
  try {
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
      console.warn('Invalid or empty data passed to jsonToCSV');
      return '';
    }
    
    // Get headers from keys of first object
    const headers = Object.keys(jsonData[0]);
    if (headers.length === 0) {
      console.warn('Object has no properties');
      return '';
    }
    
    console.log('CSV headers:', headers);
    
    // Create CSV header row
    const csvRows = [
      headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',')
    ];
    
    // Add data rows
    for (const item of jsonData) {
      try {
        const values = headers.map(header => {
          try {
            const value = item[header];
            let cellValue;
            
            // Handle different types of values
            if (value === null || value === undefined) {
              cellValue = '';
            } else if (Array.isArray(value)) {
              // Convert arrays to JSON strings
              cellValue = JSON.stringify(value).replace(/"/g, '""');
            } else if (typeof value === 'object') {
              // Convert objects to JSON strings
              cellValue = JSON.stringify(value).replace(/"/g, '""');
            } else {
              // Use simple string conversion for primitives
              cellValue = String(value);
            }
            
            // Escape quotes and wrap in quotes
            return `"${cellValue.replace(/"/g, '""')}"`;
          } catch (fieldError) {
            console.error(`Error processing field ${header}:`, fieldError);
            return '""'; // Return empty value on error
          }
        });
        
        csvRows.push(values.join(','));
      } catch (rowError) {
        console.error('Error processing row:', rowError, 'Row data:', item);
        // Continue to next row
      }
    }
    
    // Return CSV string
    const result = csvRows.join('\n');
    console.log(`CSV generated successfully with ${csvRows.length - 1} data rows`);
    return result;
  } catch (error) {
    console.error('Error generating CSV:', error);
    return '';
  }
};

// Helper function to parse CSV string back to JSON
const csvToJSON = (csvString) => {
  try {
    console.log('CSV to JSON input length:', csvString.length);
    
    const lines = csvString.split('\n');
    if (lines.length <= 1) {
      console.warn('CSV has insufficient lines:', lines.length);
      return [];
    }
    
    // Get headers from first line
    // Try to handle quoted headers with commas inside
    const headers = [];
    let currentHeader = '';
    let inQuotes = false;
    
    for (let i = 0; i < lines[0].length; i++) {
      const char = lines[0][i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < lines[0].length && lines[0][i + 1] === '"') {
          // Double quotes inside quotes are escaped quotes
          currentHeader += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        headers.push(currentHeader.trim());
        currentHeader = '';
      } else {
        currentHeader += char;
      }
    }
    
    // Add the last header
    if (currentHeader.trim()) {
      headers.push(currentHeader.trim());
    }
    
    // Remove quotes from headers if they exist
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].startsWith('"') && headers[i].endsWith('"')) {
        headers[i] = headers[i].substring(1, headers[i].length - 1).replace(/""/g, '"');
      }
    }
    
    console.log('CSV headers:', headers);
    
    const result = [];
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) {
        // Skip empty lines
        continue;
      }
      
      // Parse the line using state machine to handle quoted fields with commas
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          if (inQuotes && j + 1 < lines[i].length && lines[i][j + 1] === '"') {
            // Double quotes inside quotes are escaped quotes
            currentValue += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);
      
      // Create object from headers and values
      if (values.length === headers.length) {
        const obj = {};
        
        for (let j = 0; j < headers.length; j++) {
          try {
            let value = values[j];
            
            // Remove surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            
            // Try to parse JSON objects and arrays
            if ((value.startsWith('{') && value.endsWith('}')) || 
                (value.startsWith('[') && value.endsWith(']'))) {
              try {
                obj[headers[j]] = JSON.parse(value);
              } catch (e) {
                console.warn(`Failed to parse JSON for field ${headers[j]}: ${e.message}`);
                obj[headers[j]] = value;
              }
            } else {
              obj[headers[j]] = value;
            }
          } catch (fieldError) {
            console.error(`Error processing field ${headers[j]}:`, fieldError);
            obj[headers[j]] = '';
          }
        }
        
        result.push(obj);
      } else {
        console.warn(`Skipping row ${i}: values count (${values.length}) doesn't match headers count (${headers.length})`);
      }
    }
    
    console.log(`CSV parsing complete. Converted ${result.length} rows`);
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export default function SettingsScreen() {
  const { showToast } = useGlobalToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataSync, setDataSync] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [showDummyData, setShowDummyData] = useState(true);
  
  // Add state for menu and modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Load show dummy data setting on component mount
  useEffect(() => {
    const loadShowDummyDataSetting = async () => {
      try {
        // Use dummyDataService to load the setting
        const showDummyData = await dummyDataService.getShowDummyDataSetting();
        setShowDummyData(showDummyData);
      } catch (error) {
        console.error('Error loading show dummy data setting:', error);
        setShowDummyData(true); // Default to true on error
      }
    };
    
    loadShowDummyDataSetting();
  }, []);

  const toggleSwitch = async (setting: string, value: boolean) => {
    try {
      let storageKey: string;
      
      // Handle different settings
      switch (setting) {
        case 'darkMode':
          setDarkMode(value);
          storageKey = '@app_config_dark_mode';
          break;
        case 'notifications':
          setNotifications(value);
          storageKey = '@app_config_notifications';
          break;
        case 'showDummyData':
          setShowDummyData(value);
          
          // Use dummyDataService to manage dummy data
          await dummyDataService.setShowDummyDataSetting(value);
          
          // Show success toast
          showToast(
            value ? 'Dummy data shown' : 'Dummy data hidden', 
            'success'
          );
          
          // Skip the normal storage since dummyDataService handles it
          return;
        default:
          return;
      }
      
      // Store setting
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      }
      
      // Show toast
      showToast(`${setting} ${value ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Error toggling switch:', error);
      showToast('Error saving setting', 'error');
    }
  };

  const exportPatientData = async () => {
    try {
      setIsExporting(true);
      showToast('Preparing data for export...', 'info');
      
      // Get all patients
      const patients = await patientStorageService.getPatients();
      
      // Get all appointments
      const appointments = await appointmentStorageService.getAppointments();
      
      // Get dummy data setting
      const showDummyData = await dummyDataService.getShowDummyDataSetting();
      
      // Filter out dummy data if the setting is disabled
      let filteredPatients = patients;
      let filteredAppointments = appointments;
      
      if (!showDummyData) {
        // Filter out dummy patients (IDs 1-5)
        const initialPatientIds = Object.keys(INITIAL_PATIENTS).map(id => id);
        filteredPatients = patients.filter(patient => !initialPatientIds.includes(patient.id));
        
        // Filter out dummy appointments (IDs 1-7)
        const initialAppointmentIds = INITIAL_APPOINTMENTS.map(appointment => appointment.id);
        filteredAppointments = appointments.filter(appointment => !initialAppointmentIds.includes(appointment.id));
        
        console.log(`Filtered out ${patients.length - filteredPatients.length} dummy patients`);
        console.log(`Filtered out ${appointments.length - filteredAppointments.length} dummy appointments`);
      }
      
      // Create export data object
      const exportData = {
        patients: filteredPatients,
        appointments: filteredAppointments,
        exportDate: new Date().toISOString(),
        showDummyData // Include the setting to maintain state on import
      };
      
      // Convert to JSON string
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `holistic_health_export_${timestamp}.json`;
      
      // Format export statistics for display
      const formatExportStats = () => {
        const totalExported = filteredPatients.length + filteredAppointments.length;
        const totalItems = patients.length + appointments.length;
        const totalSkipped = totalItems - totalExported;
        
        // Build detailed summary
        let summaryMessage = `Successfully exported ${totalExported} of ${totalItems} items`;
        
        // Add detail parts
        const detailParts = [];
        if (filteredPatients.length > 0) {
          detailParts.push(`${filteredPatients.length} patients`);
        }
        if (filteredAppointments.length > 0) {
          detailParts.push(`${filteredAppointments.length} appointments`);
        }
        
        if (detailParts.length > 0) {
          summaryMessage += ` (${detailParts.join(', ')})`;
        }
        
        // Add skipped items if any
        if (totalSkipped > 0) {
          summaryMessage += `. Skipped ${totalSkipped} demo items.`;
        }
        
        return summaryMessage;
      };
      
      // Create log details string
      const logDetails = formatExportStats();
      
      if (Platform.OS === 'web') {
        // For web, download the file directly
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(url);
        
        showToast('Export complete. ' + formatExportStats(), 'success');
      } else {
        // For mobile platforms
        try {
          // Create export directory if it doesn't exist
          const exportDir = `${FileSystem.documentDirectory}exports/`;
          const exportDirInfo = await FileSystem.getInfoAsync(exportDir);
          
          if (!exportDirInfo.exists) {
            await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
          }
          
          // Write JSON file
          const filePath = `${exportDir}${filename}`;
          await FileSystem.writeAsStringAsync(filePath, jsonData);
          
          // Check if sharing is available
          if (await Sharing.isAvailableAsync()) {
            // Share the file
            await Sharing.shareAsync(filePath, {
              mimeType: 'application/json',
              dialogTitle: 'Export Health Data',
              UTI: 'public.json'
            });
            
            showToast('Export complete. ' + formatExportStats(), 'success');
          } else {
            Alert.alert('Error', 'Sharing is not available on this device');
          }
        } catch (fsError) {
          console.error('FileSystem or Sharing error:', fsError);
          showToast('Failed to export data: ' + (fsError.message || 'File system error'), 'error');
        }
      }
      
      // Add successful export log
      await logStorageService.addLog({
        operation: 'export',
        status: 'success',
        details: logDetails
      });
      
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data: ' + (error.message || 'Unknown error'), 'error');
      
      // Log error
      await logStorageService.addLog({
        operation: 'export',
        status: 'error',
        details: `Export failed: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importPatientData = async () => {
    try {
      setIsImporting(true);
      
      if (Platform.OS === 'web') {
        // For web, create a file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.multiple = false; // Only single file now
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            await processImportFile(files[0]);
          } else {
            showToast('No file selected', 'info');
            setIsImporting(false);
          }
        };
        input.click();
      } else {
        // For mobile platforms
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/csv'],
          copyToCacheDirectory: true
        });
        
        if (result.canceled) {
          showToast('Import canceled', 'info');
          setIsImporting(false);
          return;
        }
        
        // Process the selected file
        await processImportFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import data: ' + (error.message || 'Unknown error'), 'error');
      
      // Log error
      await logStorageService.addLog({
        operation: 'import',
        status: 'error',
        details: `Import failed: ${error.message || 'Unknown error'}`
      });
      
      setIsImporting(false);
    }
  };
  
  // Helper functions for validation during import
  const isValidPatient = (patient) => {
    if (!patient || typeof patient !== 'object') return false;
    if (!patient.id || !patient.name) return false;
    
    // Basic validation of required fields
    return (
      typeof patient.id === 'string' && 
      typeof patient.name === 'string' && 
      patient.name.trim() !== ''
    );
  };
  
  const isValidAppointment = (appointment) => {
    if (!appointment || typeof appointment !== 'object') return false;
    if (!appointment.id || !appointment.patientId) return false;
    
    // Basic validation of required fields
    return (
      typeof appointment.id === 'string' && 
      typeof appointment.patientId === 'string' && 
      appointment.status !== undefined
    );
  };

  const processImportFile = async (file) => {
    try {
      const fileName = file.name || file.uri.split('/').pop();
      console.log('Processing file:', fileName);
      
      let fileContent;
      
      if (Platform.OS === 'web') {
        // Read file content on web
        fileContent = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
      } else {
        // Read file content on mobile
        fileContent = await FileSystem.readAsStringAsync(file.uri);
      }
      
      console.log('File content length:', fileContent.length);
      
      // Initialize import statistics
      const stats = {
        patients: {
          total: 0,
          success: 0,
          duplicates: 0,
          invalid: 0
        },
        appointments: {
          total: 0,
          success: 0,
          duplicates: 0,
          invalid: 0
        }
      };
      
      // Determine if it's JSON or CSV
      let importedData;
      
      if (fileName.endsWith('.json')) {
        // Parse JSON data
        try {
          importedData = JSON.parse(fileContent);
          console.log('Successfully parsed JSON data');
        } catch (jsonError) {
          console.error('Failed to parse JSON:', jsonError);
          showToast('Invalid JSON file format', 'error');
          setIsImporting(false);
          return;
        }
      } else if (fileName.endsWith('.csv')) {
        // For backward compatibility with old CSV exports
        showToast('Processing CSV file...', 'info');
        return await processLegacyCSVImport([file]);
      } else {
        showToast('Unsupported file format. Please use .json or .csv files.', 'error');
        setIsImporting(false);
        return;
      }
      
      // Check if the JSON has the expected structure
      if (!importedData || (!importedData.patients && !importedData.appointments)) {
        showToast('Invalid data format: missing patients or appointments data', 'error');
        setIsImporting(false);
        return;
      }
      
      // Get current dummy data setting
      const currentShowDummyData = await dummyDataService.getShowDummyDataSetting();
      
      // Check if the import file has the dummy data setting
      if (typeof importedData.showDummyData === 'boolean' && importedData.showDummyData !== currentShowDummyData) {
        // Update the dummy data setting based on the imported value
        await dummyDataService.setShowDummyDataSetting(importedData.showDummyData);
        setShowDummyData(importedData.showDummyData);
      }
      
      // Import patients if available
      if (importedData.patients && Array.isArray(importedData.patients) && importedData.patients.length > 0) {
        stats.patients.total = importedData.patients.length;
        console.log(`Found ${stats.patients.total} patients in import file`);
        
        const existingPatients = await patientStorageService.getPatients();
        const existingPatientIds = new Set(existingPatients.map(p => p.id));
        
        const newPatients = {};
        
        for (const patient of importedData.patients) {
          if (!isValidPatient(patient)) {
            stats.patients.invalid++;
            console.warn('Skipping invalid patient record:', patient);
            continue;
          }
          
          if (existingPatientIds.has(patient.id)) {
            stats.patients.duplicates++;
            continue;
          }
          
          newPatients[patient.id] = patient;
          stats.patients.success++;
        }
        
        if (stats.patients.success > 0) {
          await patientStorageService.bulkAddPatients(newPatients);
        }
      }
      
      // Import appointments if available
      if (importedData.appointments && Array.isArray(importedData.appointments) && importedData.appointments.length > 0) {
        stats.appointments.total = importedData.appointments.length;
        console.log(`Found ${stats.appointments.total} appointments in import file`);
        
        const existingAppointments = await appointmentStorageService.getAppointments();
        const existingIds = new Set(existingAppointments.map(app => app.id));
        
        const newAppointments = [];
        
        for (const appointment of importedData.appointments) {
          if (!isValidAppointment(appointment)) {
            stats.appointments.invalid++;
            console.warn('Skipping invalid appointment record:', appointment);
            continue;
          }
          
          if (existingIds.has(appointment.id)) {
            stats.appointments.duplicates++;
            continue;
          }
          
          newAppointments.push(appointment);
          stats.appointments.success++;
        }
        
        if (stats.appointments.success > 0) {
          await appointmentStorageService.bulkAddAppointments(newAppointments);
        }
      }
      
      // Display import results in a user-friendly format
      const formatImportResults = () => {
        // Build detailed import summary
        const totalRecords = stats.patients.total + stats.appointments.total;
        const totalImported = stats.patients.success + stats.appointments.success;
        const totalDuplicates = stats.patients.duplicates + stats.appointments.duplicates;
        const totalInvalid = stats.patients.invalid + stats.appointments.invalid;
        
        console.log('Import stats:', stats);
        
        // Prepare summary message
        let summaryMessage = '';
        let toastType: ToastType = 'info';
        
        if (totalImported > 0) {
          summaryMessage = `Successfully imported ${totalImported} of ${totalRecords} records`;
          toastType = 'success';
          
          const detailParts = [];
          if (stats.patients.success > 0) {
            detailParts.push(`${stats.patients.success} patients`);
          }
          if (stats.appointments.success > 0) {
            detailParts.push(`${stats.appointments.success} appointments`);
          }
          
          if (detailParts.length > 0) {
            summaryMessage += ` (${detailParts.join(', ')})`;
          }
          
          // Add skipped/invalid counts if any
          if (totalDuplicates > 0 || totalInvalid > 0) {
            const skipParts = [];
            if (totalDuplicates > 0) {
              skipParts.push(`${totalDuplicates} duplicates`);
            }
            if (totalInvalid > 0) {
              skipParts.push(`${totalInvalid} invalid`);
            }
            
            if (skipParts.length > 0) {
              summaryMessage += `. Skipped ${skipParts.join(', ')}.`;
            }
          }
        } else if (totalDuplicates > 0 && totalInvalid === 0) {
          summaryMessage = `All ${totalDuplicates} records were duplicates. Nothing new imported.`;
        } else if (totalInvalid > 0 && totalDuplicates === 0) {
          summaryMessage = `All ${totalInvalid} records were invalid. Nothing imported.`;
          toastType = 'error';
        } else if (totalDuplicates > 0 && totalInvalid > 0) {
          summaryMessage = `No new data imported. Found ${totalDuplicates} duplicates and ${totalInvalid} invalid records.`;
          toastType = 'warning';
        } else {
          summaryMessage = 'No valid data found to import';
          toastType = 'warning';
        }
        
        return { message: summaryMessage, type: toastType };
      };
      
      // Show results to user
      const results = formatImportResults();
      showToast(results.message, results.type);
      
      // Log import results
      await logStorageService.addLog({
        operation: 'import',
        status: results.type === 'success' ? 'success' : (results.type === 'error' ? 'error' : 'warning'),
        details: results.message
      });
      
    } catch (error) {
      console.error('Error processing import file:', error);
      showToast('Failed to process import file: ' + (error.message || 'Unknown error'), 'error');
      
      // Log error
      await logStorageService.addLog({
        operation: 'import',
        status: 'error',
        details: `Import processing failed: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // For backward compatibility with old CSV exports
  const processLegacyCSVImport = async (files) => {
    try {
      let patientsFile = null;
      let appointmentsFile = null;
      
      // Initialize import statistics
      const stats = {
        patients: {
          total: 0,
          success: 0,
          duplicates: 0,
          invalid: 0
        },
        appointments: {
          total: 0,
          success: 0,
          duplicates: 0,
          invalid: 0
        }
      };
      
      // Identify which file is which
      for (const file of files) {
        const fileName = file.name || file.uri.split('/').pop();
        console.log('Processing CSV file:', fileName);
        if (fileName.includes('patients')) {
          patientsFile = file;
        } else if (fileName.includes('appointments')) {
          appointmentsFile = file;
        }
      }
      
      // Process patients data if available
      if (patientsFile) {
        let patientsContent;
        
        if (Platform.OS === 'web') {
          // Read file content on web
          patientsContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(patientsFile);
          });
        } else {
          // Read file content on mobile
          patientsContent = await FileSystem.readAsStringAsync(patientsFile.uri);
        }
        
        console.log('Patient file content length:', patientsContent.length);
        
        // Parse CSV to JSON
        const importedPatients = csvToJSON(patientsContent);
        stats.patients.total = importedPatients.length;
        console.log('Imported patients count:', importedPatients.length);
        
        if (importedPatients.length === 0) {
          showToast('No valid patient data found in file', 'warning');
        } else {
          // Get existing patients and check for duplicates
          const existingPatients = await patientStorageService.getPatients();
          console.log('Existing patients count:', existingPatients.length);
          
          // Create map of existing patient IDs for faster lookups
          const existingPatientIds = new Set(existingPatients.map(p => p.id));
          
          const newPatients = {};
          
          for (const patient of importedPatients) {
            // Validate patient data
            if (!isValidPatient(patient)) {
              stats.patients.invalid++;
              console.warn('Skipping invalid patient record:', patient);
              continue;
            }
            
            // Check if patient with same ID already exists
            if (existingPatientIds.has(patient.id)) {
              stats.patients.duplicates++;
              continue; // Skip duplicate
            }
            
            // Add to new patients object
            newPatients[patient.id] = patient;
            stats.patients.success++;
          }
          
          console.log(`Patient import results: ${stats.patients.success} new, ${stats.patients.duplicates} duplicates, ${stats.patients.invalid} invalid`);
          
          // Add new patients to storage
          if (stats.patients.success > 0) {
            await patientStorageService.bulkAddPatients(newPatients);
          }
        }
      }
      
      // Process appointments data if available
      if (appointmentsFile) {
        let appointmentsContent;
        
        if (Platform.OS === 'web') {
          // Read file content on web
          appointmentsContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(appointmentsFile);
          });
        } else {
          // Read file content on mobile
          appointmentsContent = await FileSystem.readAsStringAsync(appointmentsFile.uri);
        }
        
        // Parse CSV to JSON
        const importedAppointments = csvToJSON(appointmentsContent);
        stats.appointments.total = importedAppointments.length;
        
        // Get existing appointments and check for duplicates
        const existingAppointments = await appointmentStorageService.getAppointments();
        const existingIds = new Set(existingAppointments.map(app => app.id));
        
        const newAppointments = [];
        
        for (const appointment of importedAppointments) {
          // Validate appointment
          if (!isValidAppointment(appointment)) {
            stats.appointments.invalid++;
            console.warn('Skipping invalid appointment record:', appointment);
            continue;
          }
          
          // Check if appointment with same ID already exists
          if (existingIds.has(appointment.id)) {
            stats.appointments.duplicates++;
            continue; // Skip duplicate
          }
          
          // Add to new appointments array
          newAppointments.push(appointment);
          stats.appointments.success++;
        }
        
        console.log(`Appointment import results: ${stats.appointments.success} new, ${stats.appointments.duplicates} duplicates, ${stats.appointments.invalid} invalid`);
        
        // Add new appointments to storage
        if (stats.appointments.success > 0) {
          await appointmentStorageService.bulkAddAppointments(newAppointments);
        }
      }
      
      // Display import results in a user-friendly format
      const formatImportResults = () => {
        // Build detailed import summary
        const totalRecords = stats.patients.total + stats.appointments.total;
        const totalImported = stats.patients.success + stats.appointments.success;
        const totalDuplicates = stats.patients.duplicates + stats.appointments.duplicates;
        const totalInvalid = stats.patients.invalid + stats.appointments.invalid;
        
        console.log('Import stats:', stats);
        
        // Prepare summary message
        let summaryMessage = '';
        let toastType: ToastType = 'info';
        
        if (totalImported > 0) {
          summaryMessage = `Successfully imported ${totalImported} of ${totalRecords} records`;
          toastType = 'success';
          
          const detailParts = [];
          if (stats.patients.success > 0) {
            detailParts.push(`${stats.patients.success} patients`);
          }
          if (stats.appointments.success > 0) {
            detailParts.push(`${stats.appointments.success} appointments`);
          }
          
          if (detailParts.length > 0) {
            summaryMessage += ` (${detailParts.join(', ')})`;
          }
          
          // Add skipped/invalid counts if any
          if (totalDuplicates > 0 || totalInvalid > 0) {
            const skipParts = [];
            if (totalDuplicates > 0) {
              skipParts.push(`${totalDuplicates} duplicates`);
            }
            if (totalInvalid > 0) {
              skipParts.push(`${totalInvalid} invalid`);
            }
            
            if (skipParts.length > 0) {
              summaryMessage += `. Skipped ${skipParts.join(', ')}.`;
            }
          }
        } else if (totalDuplicates > 0 && totalInvalid === 0) {
          summaryMessage = `All ${totalDuplicates} records were duplicates. Nothing new imported.`;
        } else if (totalInvalid > 0 && totalDuplicates === 0) {
          summaryMessage = `All ${totalInvalid} records were invalid. Nothing imported.`;
          toastType = 'error';
        } else if (!patientsFile && !appointmentsFile) {
          summaryMessage = 'No valid data files found';
          toastType = 'warning';
        } else {
          summaryMessage = 'No valid data found to import';
          toastType = 'warning';
        }
        
        return { message: summaryMessage, type: toastType };
      };
      
      // Show results to user
      const results = formatImportResults();
      showToast(results.message, results.type);
      
    } catch (error) {
      console.error('Error processing import CSV files:', error);
      showToast('Failed to process CSV files: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const clearAllData = async () => {
    console.log('clearAllData function called - showing export modal');
    setShowExportModal(true);
  };

  const handleExportChoice = async (shouldExport) => {
    console.log('Export choice:', shouldExport);
    setShowExportModal(false);
    
    if (shouldExport) {
      try {
        // First trigger the export
        await exportPatientData();
        // Then ask for final confirmation to clear data
        setTimeout(() => {
          setShowConfirmClearModal(true);
        }, 500); // Add small delay to ensure first modal is closed
      } catch (error) {
        console.error('Error during export:', error);
        showToast('Export failed. Data not cleared.', 'error');
      }
    } else {
      // Directly show confirm clear modal
      setTimeout(() => {
        setShowConfirmClearModal(true);
      }, 500); // Add small delay to ensure first modal is closed
    }
  };

  const handleConfirmClear = (confirmed) => {
    console.log('Clear data confirmation:', confirmed);
    setShowConfirmClearModal(false);
    
    if (confirmed) {
      executeDataClear();
    }
  };

  const executeDataClear = async () => {
    try {
      setIsClearing(true);
      showToast('Clearing all data...', 'info');
      
      // Clear statistics
      const stats = {
        totalKeys: 0,
        removed: 0,
        preserved: 0
      };
      
      // Get all keys in localStorage
      const keysToRemove: string[] = [];
      const preservedKeys: string[] = [];
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Browser environment (localStorage)
        stats.totalKeys = localStorage.length;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            if (!key.startsWith('@app_config')) {
              keysToRemove.push(key);
            } else {
              preservedKeys.push(key);
            }
          }
        }
        
        stats.removed = keysToRemove.length;
        stats.preserved = preservedKeys.length;
        
        // Now remove the collected keys
        console.log('Clearing keys:', keysToRemove);
        console.log('Preserving keys:', preservedKeys);
        console.log('Clear statistics:', stats);
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Set first launch to false to prevent re-initialization with demo data
        localStorage.setItem('@app_first_launch', 'false');
        
        // Format clear statistics for display
        const clearSummary = `Cleared ${stats.removed} data items. Preserved ${stats.preserved} configuration items.`;
        
        // Show success message before reload
        showToast('All data cleared successfully. ' + clearSummary, 'success');
        
        // Re-initialize the storage with empty data
        await initializeStorage(true); // Pass true to force reset
        
        // Log data clear
        await logStorageService.addLog({
          operation: 'clear',
          status: 'success',
          details: clearSummary
        });
        
        // Give time for the toast to be seen
        setTimeout(() => {
          // Reload the page to reset all React state and get fresh instances
          window.location.reload();
        }, 1500);
      } else {
        // React Native environment (AsyncStorage)
        const allKeys = await AsyncStorage.getAllKeys();
        stats.totalKeys = allKeys.length;
        
        // Filter out configuration keys that should be preserved
        const keysToRemove = allKeys.filter(key => !key.startsWith('@app_config'));
        const preservedKeys = allKeys.filter(key => key.startsWith('@app_config'));
        
        stats.removed = keysToRemove.length;
        stats.preserved = preservedKeys.length;
        
        console.log('Clearing keys:', keysToRemove);
        console.log('Preserving keys:', preservedKeys);
        console.log('Clear statistics:', stats);
        
        // Remove all data keys
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
        
        // Set first launch to false to prevent re-initialization with demo data
        await AsyncStorage.setItem('@app_first_launch', 'false');
        
        // Re-initialize storage with empty data
        await initializeStorage(true);
        
        // Format clear statistics for display
        const clearSummary = `Cleared ${stats.removed} data items. Preserved ${stats.preserved} configuration items.`;
        
        // Show success message
        showToast('All data cleared successfully. ' + clearSummary, 'success');
        
        // Log data clear
        await logStorageService.addLog({
          operation: 'clear',
          status: 'success',
          details: clearSummary
        });
        
        // In a production app, you might want to restart the app or navigate to a login screen
        Alert.alert(
          'Data Cleared',
          'All data has been cleared successfully. Please restart the app for changes to take effect.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      showToast('Failed to clear data: ' + (error.message || 'Unknown error'), 'error');
      
      // Log error
      await logStorageService.addLog({
        operation: 'clear',
        status: 'error',
        details: `Data clear failed: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsClearing(false);
    }
  };

  const viewLogs = async () => {
    setMenuVisible(false);
    setIsLoadingLogs(true);
    
    try {
      const operationLogs = await logStorageService.getLogs();
      setLogs(operationLogs);
      setShowLogsModal(true);
    } catch (error) {
      console.error('Error loading logs:', error);
      showToast('Failed to load logs', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  const clearLogs = async () => {
    try {
      await logStorageService.clearLogs();
      setLogs([]);
      showToast('Logs cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing logs:', error);
      showToast('Failed to clear logs', 'error');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Settings</ThemedText>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Settings */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="bell" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
            </View>
            <Switch
              value={notifications}
              onValueChange={(value) => toggleSwitch('notifications', value)}
              color="#4CAF50"
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="moon" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(value) => toggleSwitch('darkMode', value)}
              color="#4CAF50"
              disabled={true}
            />
          </View>
          
          <View style={styles.settingDescription}>
            <ThemedText style={styles.descriptionText}>
              Display or hide sample data in your lists
            </ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="sync" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Data Sync</ThemedText>
            </View>
            <Switch
              value={dataSync}
              onValueChange={(value) => toggleSwitch('dataSync', value)}
              color="#4CAF50"
            />
          </View>
          
          <View style={styles.settingDescription}>
            <ThemedText style={styles.descriptionText}>
              Sync your data across devices when signed in
            </ThemedText>
          </View>
        </Surface>
        
        {/* Security Settings */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>Security & Privacy</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="fingerprint" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Biometric Authentication</ThemedText>
            </View>
            <Switch
              value={biometricAuth}
              onValueChange={(value) => toggleSwitch('biometricAuth', value)}
              color="#4CAF50"
              disabled={true}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="map-marker-alt" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Location Services</ThemedText>
            </View>
            <Switch
              value={locationServices}
              onValueChange={(value) => toggleSwitch('locationServices', value)}
              color="#4CAF50"
            />
          </View>
          
          <View style={styles.settingDescription}>
            <ThemedText style={styles.descriptionText}>
              Allow the app to access your location for directions to patients
            </ThemedText>
          </View>
        </Surface>
        
        {/* Data Management */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Data Management</ThemedText>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                  iconColor="#4CAF50"
                />
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item 
                onPress={viewLogs} 
                title="View Import/Export Logs"
                leadingIcon="history"
              />
            </Menu>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="database" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Show Dummy Data</ThemedText>
            </View>
            <Switch
              value={showDummyData}
              onValueChange={(value) => toggleSwitch('showDummyData', value)}
              color="#4CAF50"
            />
          </View>
          
          <View style={styles.settingDescription}>
            <ThemedText style={styles.descriptionText}>
              Display or hide sample data in your lists
            </ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.dataButtons}>
            <Button 
              mode="outlined" 
              icon={() => <FontAwesome5 name="download" size={16} color="#4CAF50" />}
              style={styles.dataButton}
              textColor="#4CAF50"
              onPress={exportPatientData}
              contentStyle={{ height: 40 }}
              loading={isExporting}
              disabled={isExporting || isImporting}
            >
              Export All Data
            </Button>
            
            <Button 
              mode="outlined" 
              icon={() => <FontAwesome5 name="upload" size={16} color="#4CAF50" />}
              style={styles.dataButton}
              textColor="#4CAF50"
              onPress={importPatientData}
              contentStyle={{ height: 40 }}
              loading={isImporting}
              disabled={isExporting || isImporting}
            >
              Import Data
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.clearDataContainer}>
            <Button 
              mode="outlined" 
              icon={() => <FontAwesome5 name="trash-alt" size={16} color="#F44336" />}
              style={styles.clearDataButton}
              textColor="#F44336"
              onPress={() => {
                console.log('Clear All Data button pressed');
                clearAllData();
              }}
              contentStyle={{ height: 40 }}
              loading={isClearing}
              disabled={isClearing}
            >
              Clear All Data
            </Button>
          </View>
        </Surface>
        
        {/* About */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          
          <View style={styles.aboutContent}>
            <FontAwesome5 name="stethoscope" size={32} color="#4CAF50" style={styles.aboutIcon} />
            <ThemedText style={styles.appName}>Holistic Health Care</ThemedText>
            <ThemedText style={styles.appVersion}>Version 1.0.0</ThemedText>
            <ThemedText style={styles.copyright}>© 2025 Holistic Health Care Systems</ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="info-circle" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Terms of Service</ThemedText>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color="#757575" />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="shield-alt" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Privacy Policy</ThemedText>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color="#757575" />
          </TouchableOpacity>
        </Surface>
      </ScrollView>
      
      {/* Export confirmation modal */}
      <Portal>
        <Dialog visible={showExportModal} onDismiss={() => setShowExportModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            <FontAwesome5 name="file-export" size={16} color="#4CAF50" style={{marginRight: 6}} />
            Export Data Before Clearing
          </Dialog.Title>
          <Dialog.Content>
            <ThemedText style={styles.dialogText}>
              Would you like to export all your data before clearing it? This ensures you have a backup of your information.
            </ThemedText>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowExportModal(false)} textColor="#757575" labelStyle={{fontSize: 13}}>
              Cancel
            </Button>
            <Button 
              onPress={() => handleExportChoice(false)} 
              textColor="#F44336"
              labelStyle={{fontSize: 13}}
            >
              No, Skip Export
            </Button>
            <Button 
              onPress={() => handleExportChoice(true)} 
              mode="contained" 
              buttonColor="#4CAF50"
              style={{borderRadius: 8}}
              labelStyle={{fontSize: 13}}
            >
              Yes, Export
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Final clear confirmation modal */}
      <Portal>
        <Dialog visible={showConfirmClearModal} onDismiss={() => setShowConfirmClearModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            <FontAwesome5 name="trash-alt" size={16} color="#F44336" style={{marginRight: 6}} />
            Confirm Clear All Data
          </Dialog.Title>
          <Dialog.Content>
            <ThemedText style={styles.dialogText}>
              Are you sure you want to permanently delete all data? This action cannot be undone.
            </ThemedText>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowConfirmClearModal(false)} textColor="#757575" labelStyle={{fontSize: 13}}>
              Cancel
            </Button>
            <Button 
              mode="contained"
              buttonColor="#F44336" 
              onPress={() => handleConfirmClear(true)}
              style={{borderRadius: 8}}
              labelStyle={{fontSize: 13}}
            >
              Yes, Clear Everything
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Import/Export Logs Modal */}
      <Portal>
        <Modal visible={showLogsModal} onDismiss={() => setShowLogsModal(false)} contentContainerStyle={styles.logsModal}>
          <View style={styles.logsModalHeader}>
            <ThemedText style={styles.logsModalTitle}>Operation Logs</ThemedText>
            <IconButton icon="close" size={20} onPress={() => setShowLogsModal(false)} />
          </View>
          
          <View style={styles.logsActionButtons}>
            <Button 
              mode="outlined"
              textColor="#F44336"
              onPress={clearLogs}
              style={styles.clearLogsButton}
              disabled={logs.length === 0}
            >
              Clear Logs
            </Button>
          </View>
          
          <ScrollView style={styles.logsContainer}>
            {isLoadingLogs ? (
              <View style={styles.logsLoadingContainer}>
                <ThemedText>Loading logs...</ThemedText>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.emptyLogsContainer}>
                <FontAwesome5 name="history" size={24} color="#CCCCCC" style={styles.emptyLogsIcon} />
                <ThemedText style={styles.emptyLogsText}>No operation logs found</ThemedText>
              </View>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logItemHeader}>
                    <View style={styles.logOperation}>
                      <FontAwesome5 
                        name={
                          log.operation === 'import' ? 'upload' : 
                          log.operation === 'export' ? 'download' : 'trash'
                        } 
                        size={14} 
                        color={
                          log.operation === 'clear' ? '#F44336' :
                          '#4CAF50'
                        }
                        style={styles.logIcon} 
                      />
                      <ThemedText style={styles.logOperationText}>
                        {log.operation.charAt(0).toUpperCase() + log.operation.slice(1)}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.logStatus, 
                      log.status === 'success' ? styles.statusSuccess : 
                      log.status === 'error' ? styles.statusError : 
                      styles.statusWarning
                    ]}>
                      <ThemedText style={styles.logStatusText}>{log.status}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.logDetails}>{log.details}</ThemedText>
                  <ThemedText style={styles.logTimestamp}>{formatDate(log.timestamp)}</ThemedText>
                </View>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#424242',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 28,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  descriptionText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 40,
  },
  divider: {
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  dataButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
  },
  dataButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aboutIcon: {
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  clearDataContainer: {
    padding: 16,
    paddingTop: 0,
  },
  clearDataButton: {
    borderColor: '#F44336',
    borderRadius: 8,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 4,
    padding: 4,
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 16,
    marginBottom: 4,
  },
  dialogText: {
    marginBottom: 12,
    fontSize: 14,
  },
  dialogActions: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 40,
  },
  logsModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
  },
  logsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  logsActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
  },
  clearLogsButton: {
    borderColor: '#F44336',
    borderRadius: 8,
  },
  logsContainer: {
    padding: 8,
    maxHeight: 500,
  },
  logsLoadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyLogsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsIcon: {
    marginBottom: 16,
  },
  emptyLogsText: {
    color: '#757575',
  },
  logItem: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logOperation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logOperationText: {
    fontWeight: '600',
    fontSize: 14,
  },
  logIcon: {
    marginRight: 6,
  },
  logStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusSuccess: {
    backgroundColor: '#E8F5E9',
  },
  statusError: {
    backgroundColor: '#FFEBEE',
  },
  statusWarning: {
    backgroundColor: '#FFF8E1',
  },
  logStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
}); 