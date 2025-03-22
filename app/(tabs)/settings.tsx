import { StyleSheet, View, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useState } from 'react';
import { Switch, Surface, Divider, Button } from 'react-native-paper';
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

// Helper function to convert JSON to CSV string
const jsonToCSV = (jsonData) => {
  if (!jsonData || jsonData.length === 0) return '';
  
  // Get headers from keys of first object
  const headers = Object.keys(jsonData[0]);
  
  // Create CSV header row
  const csvRows = [headers.join(',')];
  
  // Add data rows
  for (const item of jsonData) {
    const values = headers.map(header => {
      const value = item[header];
      // Handle nested objects by stringifying them
      const cellValue = typeof value === 'object' && value !== null 
        ? JSON.stringify(value).replace(/"/g, '""') 
        : value;
      
      // Escape commas, quotes, etc.
      return `"${String(cellValue).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  // Return CSV string
  return csvRows.join('\n');
};

// Helper function to parse CSV string back to JSON
const csvToJSON = (csvString) => {
  const lines = csvString.split('\n');
  if (lines.length <= 1) return [];
  
  // Get headers from first line
  const headers = lines[0].split(',');
  
  const result = [];
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const obj = {};
    let currentIndex = 0;
    let inQuotes = false;
    let currentValue = '';
    let headerIndex = 0;
    
    // Parse the line character by character to handle quoted fields with commas
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        // Toggle quote state
        if (inQuotes && lines[i][j+1] === '"') {
          // Handle escaped quotes
          currentValue += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        let value = currentValue.trim();
        
        // Try to parse nested JSON objects
        if (value.startsWith('{') && value.endsWith('}')) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
        
        // Assign to object using the corresponding header
        obj[headers[headerIndex]] = value;
        
        // Reset for next field
        currentValue = '';
        headerIndex++;
      } else {
        // Add character to current field value
        currentValue += char;
      }
    }
    
    // Add the last field
    if (headerIndex < headers.length) {
      let value = currentValue.trim();
      
      // Try to parse nested JSON objects
      if (value.startsWith('{') && value.endsWith('}')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      obj[headers[headerIndex]] = value;
    }
    
    result.push(obj);
  }
  
  return result;
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

  const toggleSwitch = (setting: string, value: boolean) => {
    switch (setting) {
      case 'notifications':
        setNotifications(value);
        break;
      case 'darkMode':
        setDarkMode(value);
        Alert.alert(
          'Theme Change',
          'Dark mode will be available in a future update.',
          [{ text: 'OK' }]
        );
        break;
      case 'dataSync':
        setDataSync(value);
        break;
      case 'biometricAuth':
        setBiometricAuth(value);
        Alert.alert(
          'Biometric Authentication',
          'Biometric authentication will be available in a future update.',
          [{ text: 'OK' }]
        );
        break;
      case 'locationServices':
        setLocationServices(value);
        break;
      case 'autoBackup':
        setAutoBackup(value);
        break;
    }
  };

  const exportPatientData = async () => {
    try {
      setIsExporting(true);
      showToast('Preparing data for export...', 'info');
      
      // Get all data to export
      const patients = await patientStorageService.getPatients();
      const appointments = await appointmentStorageService.getAppointments();
      
      // Create data for export
      const exportData = {
        patients: Object.values(patients),
        appointments
      };
      
      // Convert to CSV
      const patientsCSV = jsonToCSV(Object.values(patients));
      const appointmentsCSV = jsonToCSV(appointments);
      
      // Create export directory if it doesn't exist
      const exportDir = `${FileSystem.documentDirectory}exports/`;
      const exportDirInfo = await FileSystem.getInfoAsync(exportDir);
      
      if (!exportDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      }
      
      // Write CSV files
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const patientsFile = `${exportDir}patients_${timestamp}.csv`;
      const appointmentsFile = `${exportDir}appointments_${timestamp}.csv`;
      
      await FileSystem.writeAsStringAsync(patientsFile, patientsCSV);
      await FileSystem.writeAsStringAsync(appointmentsFile, appointmentsCSV);
      
      // Create a zip file with both CSVs
      const zipFile = `${FileSystem.documentDirectory}holistic_health_export_${timestamp}.zip`;
      
      // For simplicity, we'll just share each file separately instead of zipping
      // Share files
      if (Platform.OS === 'web') {
        // For web, download the files
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(patientsCSV));
        element.setAttribute('download', `patients_${timestamp}.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        // Download appointments file
        const element2 = document.createElement('a');
        element2.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(appointmentsCSV));
        element2.setAttribute('download', `appointments_${timestamp}.csv`);
        element2.style.display = 'none';
        document.body.appendChild(element2);
        element2.click();
        document.body.removeChild(element2);
        
        showToast('Export complete. Files downloaded.', 'success');
      } else {
        // For mobile platforms
        if (await Sharing.isAvailableAsync()) {
          // Share the patients file first
          await Sharing.shareAsync(patientsFile, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Patients Data',
            UTI: 'public.comma-separated-values-text'
          });
          
          // Then share the appointments file
          await Sharing.shareAsync(appointmentsFile, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Appointments Data',
            UTI: 'public.comma-separated-values-text'
          });
          
          showToast('Export complete', 'success');
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data', 'error');
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
        input.accept = '.csv';
        input.multiple = true; // Allow multiple files
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            await processImportFiles(files);
          } else {
            showToast('No files selected', 'info');
            setIsImporting(false);
          }
        };
        input.click();
      } else {
        // For mobile platforms
        const result = await DocumentPicker.getDocumentAsync({
          type: 'text/csv',
          multiple: true,
          copyToCacheDirectory: true
        });
        
        if (result.canceled) {
          showToast('Import canceled', 'info');
          setIsImporting(false);
          return;
        }
        
        // Process the selected files
        await processImportFiles(result.assets);
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import data', 'error');
      setIsImporting(false);
    }
  };
  
  const processImportFiles = async (files) => {
    try {
      let patientsFile = null;
      let appointmentsFile = null;
      
      // Identify which file is which
      for (const file of files) {
        const fileName = file.name || file.uri.split('/').pop();
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
        
        // Parse CSV to JSON
        const importedPatients = csvToJSON(patientsContent);
        
        // Get existing patients and check for duplicates
        const existingPatients = await patientStorageService.getPatients();
        const newPatients = {};
        let duplicateCount = 0;
        let addedCount = 0;
        
        for (const patient of importedPatients) {
          // Check if patient with same ID already exists
          if (existingPatients[patient.id]) {
            duplicateCount++;
            continue; // Skip duplicate
          }
          
          // Add to new patients object
          newPatients[patient.id] = patient;
          addedCount++;
        }
        
        // Add new patients to storage
        if (addedCount > 0) {
          await patientStorageService.bulkAddPatients(newPatients);
          showToast(`Imported ${addedCount} patients (${duplicateCount} duplicates skipped)`, 'success');
        } else if (duplicateCount > 0) {
          showToast(`No new patients added. ${duplicateCount} duplicates skipped.`, 'info');
        } else {
          showToast('No patients data found in file', 'info');
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
        
        // Get existing appointments and check for duplicates
        const existingAppointments = await appointmentStorageService.getAppointments();
        const existingIds = new Set(existingAppointments.map(app => app.id));
        
        const newAppointments = [];
        let duplicateCount = 0;
        let addedCount = 0;
        
        for (const appointment of importedAppointments) {
          // Check if appointment with same ID already exists
          if (existingIds.has(appointment.id)) {
            duplicateCount++;
            continue; // Skip duplicate
          }
          
          // Add to new appointments array
          newAppointments.push(appointment);
          addedCount++;
        }
        
        // Add new appointments to storage
        if (addedCount > 0) {
          await appointmentStorageService.bulkAddAppointments(newAppointments);
          showToast(`Imported ${addedCount} appointments (${duplicateCount} duplicates skipped)`, 'success');
        } else if (duplicateCount > 0) {
          showToast(`No new appointments added. ${duplicateCount} duplicates skipped.`, 'info');
        } else {
          showToast('No appointments data found in file', 'info');
        }
      }
      
      if (!patientsFile && !appointmentsFile) {
        showToast('No valid data files found', 'warning');
      }
    } catch (error) {
      console.error('Error processing import files:', error);
      showToast('Failed to process import files', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all app data? This action cannot be undone.',
      [
        { 
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              showToast('Clearing all data...', 'info');
              
              // Clear all storage
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                // For web platform
                window.localStorage.clear();
                // Reset the first launch flag
                window.localStorage.setItem('@app_first_launch', 'false');
                
                // Show success message before reload
                showToast('All data cleared successfully. Reloading app...', 'success');
                
                // Give time for the toast to be seen
                setTimeout(() => {
                  // Reload the page to reset all React state and get fresh instances
                  window.location.reload();
                }, 1500);
              } else {
                // For native platforms
                await AsyncStorage.clear();
                // Reset the first launch flag
                await AsyncStorage.setItem('@app_first_launch', 'false');
                
                // Show success message
                showToast('All data has been cleared successfully', 'success');
                setIsClearing(false);
                
                // In a production app, you might want to restart the app or navigate to a login screen
                // For now, we'll just show a success message
                Alert.alert(
                  'Data Cleared',
                  'All data has been cleared successfully. Please restart the app for changes to take effect.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error clearing data:', error);
              setIsClearing(false);
              showToast('Failed to clear data. Please try again.', 'error');
            }
          }
        }
      ]
    );
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
          <ThemedText style={styles.sectionTitle}>Data Management</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <FontAwesome5 name="database" size={18} color="#4CAF50" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Auto Backup</ThemedText>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={(value) => toggleSwitch('autoBackup', value)}
              color="#4CAF50"
            />
          </View>
          
          <View style={styles.settingDescription}>
            <ThemedText style={styles.descriptionText}>
              Automatically backup your data daily
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
              Export Data
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
              onPress={clearAllData}
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
}); 