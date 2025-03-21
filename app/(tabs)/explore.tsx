import { StyleSheet, FlatList, TouchableOpacity, View, Linking, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useState, useEffect } from "react";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { usePatients, getPatientsArray, Patient } from "@/utils/patientStore";
import { FAB, Button, Divider, Surface, Searchbar, Avatar } from 'react-native-paper';
import { 
  addAppointment,
  sortAppointmentsByDateDesc 
} from '@/utils/appointmentStore';

// Mock appointment data for adding new appointments
const MOCK_APPOINTMENTS = [
  {
    id: '1',
    patientId: '1',
    patientName: 'John Doe',
    date: '2023-06-15',
    time: '09:30 AM',
    reason: 'Follow-up',
    status: 'confirmed',
  },
  // More appointments...
];

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
  const { patientsArray } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Initialize filtered patients on component mount and when patients change
  useEffect(() => {
    setFilteredPatients(patientsArray);
  }, [patientsArray]);

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(patientsArray);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patientsArray.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        patient.phone.includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patientsArray]);

  const handleScheduleAppointment = (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => {
    // Use the appointmentStore to add the appointment
    const newAppointment = addAppointment({
      date: appointmentData.date,
      time: appointmentData.time,
      reason: appointmentData.reason,
      notes: appointmentData.notes,
      patientId: appointmentData.patientId,
      status: 'pending'
    });
    
    // Show toast notification
    alert(`Appointment scheduled for ${formatDate(newAppointment.date)} at ${newAppointment.time}`);
    
    // Close scheduler
    setSchedulerVisible(false);
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

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <Surface style={styles.patientCard} elevation={1}>
      <TouchableOpacity 
        style={styles.patientCardContent}
        onPress={() => router.push(`/patient/${item.id}`)}
      >
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
      </TouchableOpacity>
      
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
      <View style={styles.header}>
        <ThemedText style={styles.title}>Patient Directory</ThemedText>
      </View>

      <Searchbar
        placeholder="Search by name or phone..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
        iconColor="#4CAF50"
        inputStyle={{ color: '#333333' }}
        theme={{ colors: { primary: '#4CAF50' } }}
      />

      {filteredPatients.length === 0 ? (
        <View style={styles.emptyContent}>
          <FontAwesome5 name="users" size={48} color="#CCCCCC" />
          <ThemedText style={styles.emptyText}>No patients found</ThemedText>
          <ThemedText style={styles.emptySubText}>
            {searchQuery ? 'Try a different search term' : 'Add a patient to get started'}
          </ThemedText>
          <Button 
            mode="outlined" 
            icon={() => <FontAwesome5 name="user-plus" size={16} color="#4CAF50" />}
            style={styles.addPatientButton}
            textColor="#4CAF50"
            onPress={() => router.push("/register")}
          >
            Add New Patient
          </Button>
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
      <AppointmentScheduler
        isVisible={isSchedulerVisible}
        onClose={() => setSchedulerVisible(false)}
        onSchedule={handleScheduleAppointment}
        patientId={selectedPatientId || undefined}
      />
      
      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => router.push("/register")}
      />
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
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
    borderRadius: 12,
    height: 50,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
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
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    color: '#9E9E9E',
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubText: {
    color: '#9E9E9E',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  addPatientButton: {
    marginTop: 20,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 