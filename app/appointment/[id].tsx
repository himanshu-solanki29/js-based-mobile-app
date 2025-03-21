import { StyleSheet, View, ScrollView, TextInput as RNTextInput, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { formatDate } from "@/utils/dateFormat";
import { 
  Appbar, 
  Surface, 
  Divider, 
  Button, 
  TextInput, 
  SegmentedButtons,
  Dialog,
  Menu,
  IconButton
} from 'react-native-paper';

import { 
  MOCK_APPOINTMENTS, 
  Appointment, 
  updateAppointmentStatus, 
  getPatientName 
} from "@/utils/appointmentStore";
import { getPatientById } from "@/utils/patientStore";
import { AppointmentStatus } from "@/utils/types";
import { MedicalRecordForm } from "@/components/MedicalRecordForm";
import { MedicalRecordCard } from "@/components/MedicalRecordCard";

// Define the MedicalRecord interface directly here to avoid any import issues
interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
}

export default function AppointmentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  
  // Medical record form fields
  const [medicalRecordDialogVisible, setMedicalRecordDialogVisible] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord>({
    complaint: '',
    diagnosis: '',
    bloodPressure: '',
    weight: '',
    prescription: ''
  });
  
  // Status change dialog
  const [statusChangeDialogVisible, setStatusChangeDialogVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState("");
  
  useEffect(() => {
    // Find the appointment in our data
    const foundAppointment = MOCK_APPOINTMENTS.find(a => a.id === id);
    
    if (foundAppointment) {
      setAppointment(foundAppointment);
      const patientData = getPatientById(foundAppointment.patientId);
      if (patientData) {
        setPatient(patientData);
        
        // Pre-fill medical record form with patient's current data
        setMedicalRecord(prev => ({
          ...prev,
          complaint: foundAppointment.reason, // Use reason as initial complaint
          bloodPressure: patientData.bloodPressure || "",
          weight: patientData.weight || ""
        }));
      }
    }
    
    setLoading(false);
  }, [id]);
  
  // Updated handleCompletionWithMedicalRecord function to use the MedicalRecord interface
  const handleCompletionWithMedicalRecord = () => {
    if (!appointment) return;
    
    // Create a combined note with all medical record information
    const fullNotes = `Complaint: ${medicalRecord.complaint || appointment.reason}\nDiagnosis: ${medicalRecord.diagnosis || 'No diagnosis provided'}\nBlood Pressure: ${medicalRecord.bloodPressure || 'Not recorded'}\nWeight: ${medicalRecord.weight || 'Not recorded'}\nPrescription: ${medicalRecord.prescription || 'No prescription'}`; 
    
    // Update the appointment status with the combined notes
    const updatedAppointment = updateAppointmentStatus(
      appointment.id,
      'completed',
      fullNotes
    );
    
    if (updatedAppointment) {
      setAppointment(updatedAppointment);
      Alert.alert(
        "Appointment Completed",
        "Appointment has been marked as completed with medical record.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };
  
  // Handlers for medical record form fields
  const handleMedicalRecordChange = (field: keyof MedicalRecord, value: string) => {
    setMedicalRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Function to handle changing appointment status
  const handleStatusChange = () => {
    if (!appointment || !selectedStatus) return;
    
    const updatedAppointment = updateAppointmentStatus(
      appointment.id,
      selectedStatus,
      statusChangeNotes
    );
    
    if (updatedAppointment) {
      setAppointment(updatedAppointment);
      setStatusChangeDialogVisible(false);
      setSelectedStatus(null);
      setStatusChangeNotes("");
      
      Alert.alert(
        "Status Updated",
        `Appointment has been marked as ${selectedStatus}.`,
        [{ text: "OK" }]
      );
    }
  };
  
  // Helper to open status change dialog
  const openStatusChangeDialog = (status: AppointmentStatus) => {
    setSelectedStatus(status);
    setStatusMenuVisible(false);
    setStatusChangeDialogVisible(true);
  };
  
  // Helper to determine if a status action should be shown
  const shouldShowStatusAction = (status: AppointmentStatus): boolean => {
    if (!appointment) return false;
    
    // Don't show current status as an option
    if (appointment.status === status) return false;
    
    return true;
  };
  
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }
  
  if (!appointment || !patient) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Appointment not found</ThemedText>
        <Button onPress={() => router.back()}>Go Back</Button>
      </ThemedView>
    );
  }
  
  // Format appointment date
  const formattedDate = formatDate(appointment.date);
  const formattedDateTime = `${formattedDate} at ${appointment.time}`;
  
  // Determine status color scheme
  const getStatusColors = () => {
    switch (appointment.status) {
      case 'confirmed':
        return { backgroundColor: '#E8F5E9', textColor: '#2E7D32' };
      case 'pending':
        return { backgroundColor: '#FFF3E0', textColor: '#E65100' };
      case 'cancelled':
        return { backgroundColor: '#FFEBEE', textColor: '#C62828' };
      case 'completed':
        return { backgroundColor: '#E0F2F1', textColor: '#00695C' };
      default:
        return { backgroundColor: '#E8F5E9', textColor: '#2E7D32' };
    }
  };
  
  const statusColors = getStatusColors();
  
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction color="white" onPress={() => router.back()} />
        <Appbar.Content 
          title="Appointment Details" 
          titleStyle={styles.appBarTitle}
        />
        
        {/* Status change menu - only show for pending or confirmed appointments */}
        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <IconButton 
                icon="dots-vertical" 
                iconColor="white" 
                onPress={() => setStatusMenuVisible(true)}
              />
            }
            contentStyle={styles.statusMenuContent}
          >
            {appointment.status === 'pending' && (
              <Menu.Item 
                onPress={() => openStatusChangeDialog('confirmed')} 
                title="Confirm Appointment" 
                leadingIcon={props => <FontAwesome5 name="check-circle" size={16} color="#4CAF50" {...props} />}
              />
            )}
            
            {appointment.status === 'confirmed' && (
              <Menu.Item 
                onPress={() => setMedicalRecordDialogVisible(true)} 
                title="Complete with Medical Record" 
                leadingIcon={props => <FontAwesome5 name="notes-medical" size={16} color="#00897B" {...props} />}
              />
            )}
            
            {appointment.status === 'pending' && (
              <Menu.Item 
                onPress={() => openStatusChangeDialog('cancelled')} 
                title="Cancel Appointment" 
                leadingIcon={props => <FontAwesome5 name="times-circle" size={16} color="#F44336" {...props} />}
              />
            )}
          </Menu>
        )}
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Appointment Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
              <ThemedText style={[styles.statusText, { color: statusColors.textColor }]}>
                {appointment.status}
              </ThemedText>
            </View>
            
            <ThemedText style={styles.appointmentDateTime}>
              <FontAwesome5 name="calendar-alt" size={14} color="#4CAF50" style={styles.headerIcon} /> {formattedDateTime}
            </ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.reasonContainer}>
            <ThemedText style={styles.reasonLabel}>Reason:</ThemedText>
            <ThemedText style={styles.reasonText}>{appointment.reason}</ThemedText>
          </View>
          
          {appointment.notes && (
            <View style={styles.notesContainer}>
              <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
              <ThemedText style={styles.notesText}>{appointment.notes}</ThemedText>
            </View>
          )}
        </Surface>
        
        {/* Patient Information */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="user" size={18} color="#4CAF50" style={styles.cardHeaderIcon} />
            <ThemedText style={styles.cardHeaderTitle}>Patient Information</ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.patientInfoContainer}>
            <ThemedText style={styles.patientName}>{patient.name}</ThemedText>
            <ThemedText style={styles.patientDetail}>
              <FontAwesome5 name="user-alt" size={14} color="#4CAF50" style={styles.detailIcon} /> {patient.age} years • {patient.gender}
            </ThemedText>
            <ThemedText style={styles.patientDetail}>
              <FontAwesome5 name="phone" size={14} color="#4CAF50" style={styles.detailIcon} /> {patient.phone}
            </ThemedText>
            <ThemedText style={styles.patientDetail}>
              <FontAwesome5 name="envelope" size={14} color="#4CAF50" style={styles.detailIcon} /> {patient.email}
            </ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined"
              icon={() => <FontAwesome5 name="user" size={16} color="#4CAF50" />}
              style={styles.actionButton}
              textColor="#4CAF50"
              onPress={() => router.push(`/patient/${patient.id}`)}
            >
              View Patient Profile
            </Button>
          </View>
        </Surface>
        
        {/* Medical Information */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="heartbeat" size={18} color="#4CAF50" style={styles.cardHeaderIcon} />
            <ThemedText style={styles.cardHeaderTitle}>Medical Information</ThemedText>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.medicalInfoContainer}>
            <View style={styles.medicalInfoRow}>
              <ThemedText style={styles.medicalInfoLabel}>Blood Pressure:</ThemedText>
              <ThemedText style={styles.medicalInfoValue}>{patient.bloodPressure || 'Not recorded'}</ThemedText>
            </View>
            
            <View style={styles.medicalInfoRow}>
              <ThemedText style={styles.medicalInfoLabel}>Weight:</ThemedText>
              <ThemedText style={styles.medicalInfoValue}>{patient.weight || 'Not recorded'}</ThemedText>
            </View>
            
            <View style={styles.medicalInfoRow}>
              <ThemedText style={styles.medicalInfoLabel}>Height:</ThemedText>
              <ThemedText style={styles.medicalInfoValue}>{patient.height || 'Not recorded'}</ThemedText>
            </View>
            
            <View style={styles.medicalInfoRow}>
              <ThemedText style={styles.medicalInfoLabel}>Medical History:</ThemedText>
              <ThemedText style={styles.medicalInfoValue}>{patient.medicalHistory || 'None'}</ThemedText>
            </View>
          </View>
        </Surface>
        
        {/* Medical Record Card - only show for completed appointments */}
        {appointment.status === 'completed' && appointment.notes && (
          <MedicalRecordCard notes={appointment.notes} />
        )}
        
        {/* Medical Record Form for confirmed appointments */}
        {appointment.status === 'confirmed' && (
          <MedicalRecordForm
            initialValues={{
              complaint: appointment.reason,
              bloodPressure: patient.bloodPressure || '',
              weight: patient.weight || '',
            }}
            onSubmit={handleCompletionWithMedicalRecord}
            submitButtonText="Complete Appointment"
          />
        )}
        
        {/* Action buttons at the bottom */}
        <Surface style={styles.bottomActions} elevation={1}>
          <Button 
            mode="outlined"
            icon={() => <FontAwesome5 name="arrow-left" size={16} color="#757575" />}
            style={styles.cancelButton}
            textColor="#757575"
            onPress={() => router.back()}
          >
            Back
          </Button>
          
          {appointment.status === 'pending' && (
            <View style={styles.buttonGroup}>
              <Button 
                mode="outlined"
                icon={() => <FontAwesome5 name="times" size={16} color="#F44336" />}
                style={styles.cancelAppointmentButton}
                textColor="#F44336"
                onPress={() => openStatusChangeDialog('cancelled')}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                icon={() => <FontAwesome5 name="check" size={16} color="#FFFFFF" />}
                style={styles.confirmButton}
                buttonColor="#4CAF50"
                textColor="#FFFFFF"
                onPress={() => openStatusChangeDialog('confirmed')}
              >
                Confirm
              </Button>
            </View>
          )}
        </Surface>
      </ScrollView>
      
      {/* Status Change Dialog */}
      <Dialog 
        visible={statusChangeDialogVisible} 
        onDismiss={() => setStatusChangeDialogVisible(false)}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>
          <FontAwesome5 
            name={
              selectedStatus === 'confirmed' ? 'check-circle' : 
              selectedStatus === 'cancelled' ? 'times-circle' : 
              selectedStatus === 'pending' ? 'clock' : 'calendar-check'
            } 
            size={16} 
            color={
              selectedStatus === 'confirmed' || selectedStatus === 'pending' ? '#4CAF50' : 
              selectedStatus === 'cancelled' ? '#F44336' : '#4CAF50'
            } 
            style={{marginRight: 6}} 
          />
          {selectedStatus === 'confirmed' ? 'Confirm Appointment' :
           selectedStatus === 'cancelled' ? 'Cancel Appointment' :
           selectedStatus === 'pending' ? 'Restore Appointment' : 'Change Status'}
        </Dialog.Title>
        
        <Dialog.Content>
          <ThemedText style={styles.dialogText}>
            {selectedStatus === 'confirmed' ? 'Are you sure you want to confirm this appointment?' :
             selectedStatus === 'cancelled' ? 'Are you sure you want to cancel this appointment?' :
             selectedStatus === 'pending' ? 'Restore this appointment to pending status?' :
             'Change the status of this appointment?'}
          </ThemedText>
          
          <TextInput
            label="Notes (optional)"
            value={statusChangeNotes}
            onChangeText={setStatusChangeNotes}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={2}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
        </Dialog.Content>
        
        <Dialog.Actions style={styles.dialogActions}>
          <Button 
            onPress={() => setStatusChangeDialogVisible(false)} 
            textColor="#757575"
          >
            Cancel
          </Button>
          <Button 
            onPress={handleStatusChange}
            mode="contained"
            buttonColor={
              selectedStatus === 'confirmed' || selectedStatus === 'pending' ? '#4CAF50' : 
              selectedStatus === 'cancelled' ? '#F44336' : '#4CAF50'
            }
            style={{borderRadius: 8}}
          >
            {selectedStatus === 'confirmed' ? 'Confirm' :
             selectedStatus === 'cancelled' ? 'Cancel Appointment' :
             selectedStatus === 'pending' ? 'Restore' : 'Change Status'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  appBar: {
    backgroundColor: '#4CAF50',
    elevation: 0,
  },
  appBarTitle: {
    color: 'white', 
    fontSize: 18,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  statusHeader: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  appointmentDateTime: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerIcon: {
    marginRight: 4,
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  reasonContainer: {
    padding: 16,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesContainer: {
    padding: 16,
    paddingTop: 0,
  },
  notesLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  patientInfoContainer: {
    padding: 16,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  patientDetail: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 4,
    width: 20,
    textAlign: 'center',
  },
  actionButtons: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  medicalInfoContainer: {
    padding: 16,
  },
  medicalInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  medicalInfoLabel: {
    fontSize: 14,
    color: '#757575',
    width: 120,
  },
  medicalInfoValue: {
    fontSize: 14,
    flex: 1,
  },
  bottomActions: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  completeButton: {
    flex: 2,
    borderRadius: 8,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 16,
  },
  dialogText: {
    marginBottom: 16,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  dialogActions: {
    padding: 8,
    paddingRight: 16,
  },
  statusMenuContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
  },
  medicalRecordFormContainer: {
    padding: 16,
  },
  buttonGroup: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelAppointmentButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#F44336',
    borderRadius: 8,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
  },
}); 