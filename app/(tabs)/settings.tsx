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

export default function SettingsScreen() {
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
      const patients = getPatientsArray();
      const fileUri = `${FileSystem.documentDirectory}patient_data.json`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(patients, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export patient data');
      console.error(error);
    }
  };

  const importPatientData = async () => {
    Alert.alert(
      'Import Patient Data',
      'This feature will be available in a future update.',
      [{ text: 'OK' }]
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
              disabled={true}
            >
              Import Data
            </Button>
          </View>
        </Surface>
        
        {/* About */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          
          <View style={styles.aboutContent}>
            <FontAwesome5 name="stethoscope" size={32} color="#4CAF50" style={styles.aboutIcon} />
            <ThemedText style={styles.appName}>HealthTrack Pro</ThemedText>
            <ThemedText style={styles.appVersion}>Version 1.0.0</ThemedText>
            <ThemedText style={styles.copyright}>© 2023 HealthTrack Systems</ThemedText>
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
}); 