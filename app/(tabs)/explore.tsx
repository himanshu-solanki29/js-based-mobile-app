import { StyleSheet, FlatList, TouchableOpacity, View, Linking, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { useRouter, Stack } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useState, useEffect, useMemo } from "react";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { Patient } from "@/utils/patientStore";
import { FAB, Button, Divider, Surface, Searchbar, Avatar, TouchableRipple, Text } from 'react-native-paper';
import { 
  addAppointment,
  sortAppointmentsByDateDesc 
} from '@/utils/appointmentStore';
import PatientFormDialog from "@/components/PatientFormDialog";
import { useGlobalToast } from '@/components/GlobalToastProvider';
import usePatientStorage from '@/utils/usePatientStorage';

// Define appointment type
type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
};

export default function ExploreScreen() {
  const router = useRouter();
  const { patients, loading } = usePatientStorage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isPatientFormVisible, setPatientFormVisible] = useState(false);
  const [addPatientDialogVisible, setAddPatientDialogVisible] = useState(false);
  const { showToast } = useGlobalToast();
  
  // Use all patients directly without filtering dummy data
  const realPatients = patients;

  // Initialize filtered patients on component mount and when patients change
  useEffect(() => {
    setFilteredPatients(realPatients);
  }, [realPatients]);

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(realPatients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = realPatients.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        patient.phone.includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, realPatients]);

  const handleScheduleAppointment = async (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => {
    console.log("Scheduling appointment with data:", appointmentData);
    
    try {
      // Add appointment to the store
      const appointment = await addAppointment({
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason,
        notes: appointmentData.notes,
        patientId: appointmentData.patientId,
        status: 'pending'
      });
      
      // Display success message
      showToast(`Appointment scheduled for ${formatDate(appointment.date)} at ${appointment.time}`, "success");
      
      // Close scheduler dialog
      setSchedulerVisible(false);
      setSelectedPatientId(null);
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      showToast("Error scheduling appointment", "error");
    }
  };
  
  const openScheduler = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSchedulerVisible(true);
  };

  const handleCallPatient = (phone: string, name: string) => {
    Linking.canOpenURL(`tel:${phone}`)
      .then(supported => {
        if (supported) {
          Linking.openURL(`tel:${phone}`);
        } else {
          Alert.alert('Phone call not supported', `Cannot make a call to ${name}`);
        }
      })
      .catch(err => Alert.alert('Error', 'Failed to make phone call'));
  };

  const handleMessagePatient = (phone: string, name: string) => {
    Linking.canOpenURL(`sms:${phone}`)
      .then(supported => {
        if (supported) {
          Linking.openURL(`sms:${phone}`);
        } else {
          Alert.alert('SMS not supported', `Cannot send a message to ${name}`);
        }
      })
      .catch(err => Alert.alert('Error', 'Failed to open messaging app'));
  };

  const handlePatientFormSuccess = (patientId: string) => {
    // Show success message
    showToast('Patient added successfully!', 'success');
    
    // Close the dialog and refresh patients list
    setPatientFormVisible(false);
    // Re-fetch patients
    setFilteredPatients(patients);
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <Surface style={styles.patientCard} elevation={1}>
      <TouchableRipple
        style={styles.patientCardContent}
        onPress={() => router.push(`/patient/${item.id}`)}
        rippleColor="rgba(0, 0, 0, 0.1)"
      >
        <View>
          <View style={styles.patientHeader}>
            <View style={styles.patientNameContainer}>
              <Avatar.Icon 
                size={40} 
                icon="account" 
                style={{ backgroundColor: '#E8F5E9' }}
                color="#4CAF50"
              />
              <View style={styles.patientNameDetails}>
                <ThemedText style={styles.patientName}>{item.name}</ThemedText>
                <ThemedText style={styles.patientDemographics}>
                  {item.age} years • {item.gender}
                </ThemedText>
              </View>
            </View>
          </View>
          
          <Divider style={styles.divider} />
        
          <View style={styles.patientDetails}>
            <View style={styles.detailRow}>
              <FontAwesome5 name="phone" size={14} color="#4CAF50" style={styles.detailIcon} />
              <ThemedText style={styles.detailText}>{item.phone}</ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <FontAwesome5 name="envelope" size={14} color="#4CAF50" style={styles.detailIcon} />
              <ThemedText style={styles.detailText}>{item.email}</ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <FontAwesome5 name="calendar-check" size={14} color="#4CAF50" style={styles.detailIcon} />
              <ThemedText style={styles.detailText}>
                Last Visit: {item.lastVisit ? formatDate(item.lastVisit) : 'No visits yet'}
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableRipple>
      
      <Divider style={styles.divider} />
      
      <View style={styles.contactActions}>
        <Button 
          mode="outlined" 
          icon={() => <FontAwesome5 name="phone" size={14} color="#4CAF50" />}
          style={styles.contactButton}
          textColor="#4CAF50"
          onPress={() => handleCallPatient(item.phone, item.name)}
          labelStyle={styles.buttonLabel}
        >
          Call
        </Button>
        
        <Button 
          mode="outlined" 
          icon={() => <FontAwesome5 name="comment" size={14} color="#4CAF50" />}
          style={styles.contactButton}
          textColor="#4CAF50"
          onPress={() => handleMessagePatient(item.phone, item.name)}
          labelStyle={styles.buttonLabel}
        >
          Message
        </Button>
        
        <Button 
          mode="outlined" 
          icon={() => <FontAwesome5 name="calendar-plus" size={14} color="#4CAF50" />}
          style={styles.contactButton}
          textColor="#4CAF50"
          onPress={() => openScheduler(item.id)}
          labelStyle={styles.buttonLabel}
        >
          Schedule
        </Button>
      </View>
    </Surface>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <Text style={[styles.title, {fontSize: 28, fontWeight: '700', color: '#2e7d32'}]}>Patients</Text>
      </View>

      <Searchbar
        placeholder="Search by name or phone..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[
          styles.searchBar, 
          { 
            backgroundColor: '#f1f8e9',
            borderWidth: 1,
            borderColor: '#2e7d32',
            borderRadius: 12,
            elevation: 0
          }
        ]}
        theme={{ colors: { primary: '#2e7d32' } }}
        iconColor="#2e7d32"
      />

      {filteredPatients.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <FontAwesome5 name="users" size={48} color="#CCCCCC" />
          <Text style={styles.noResultsText}>No patients found</Text>
          <Text style={styles.noResultsSubText}>
            Tap the + button below to add your first patient
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Appointment Scheduler */}
      {isSchedulerVisible && selectedPatientId && (
        <AppointmentScheduler
          isVisible={isSchedulerVisible}
          onClose={() => setSchedulerVisible(false)}
          onSchedule={handleScheduleAppointment}
          patientId={selectedPatientId}
        />
      )}
      
      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => setPatientFormVisible(true)}
      />
      
      {/* Patient Form Dialog */}
      <PatientFormDialog 
        visible={isPatientFormVisible} 
        onDismiss={() => setPatientFormVisible(false)} 
        onSuccess={handlePatientFormSuccess} 
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2e7d32',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 0,
    borderRadius: 12,
  },
  list: {
    width: "100%"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  patientCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 16,
    overflow: 'hidden',
  },
  patientCardContent: {
    padding: 16,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientNameDetails: {
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientDemographics: {
    fontSize: 14,
    color: '#666666',
  },
  divider: {
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  patientDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 12,
    width: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#555555',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 4,
  },
  contactButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    color: '#2e7d32',
  },
  noResultsSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  fab: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 