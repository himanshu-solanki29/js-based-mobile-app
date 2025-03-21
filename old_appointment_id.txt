import { StyleSheet, View, ScrollView, TextInput as RNTextInput, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  IconButton,
  Badge,
  Portal,
  ActivityIndicator
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
import { useGlobalToast } from "@/components/GlobalToastProvider";
import LottieView from 'lottie-react-native';

// Define status colors for consistent styling
const STATUS_COLORS = {
  confirmed: {
    bg: '#E8F5E9',
    text: '#2E7D32',
    accent: '#4CAF50'
  },
  pending: {
    bg: '#FFF3E0',
    text: '#E65100',
    accent: '#FF9800'
  },
  completed: {
    bg: '#E3F2FD',
    text: '#0D47A1',
    accent: '#2196F3'
  },
  cancelled: {
    bg: '#FFEBEE',
    text: '#B71C1C',
    accent: '#F44336'
  }
};

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
  const { showToast } = useGlobalToast();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
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
  
  // States for UI updates
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // New state for status transition animation
  const [statusChanged, setStatusChanged] = useState(false);
  
  // New state for completing an appointment
  const [completeDialogVisible, setCompleteDialogVisible] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  
  const animationRef = useRef<LottieView>(null);
  
  // This effect is triggered when appointment status changes and updates all states
  useEffect(() => {
    if (appointment) {
      // Reset action in progress when appointment status changes
      setActionInProgress(false);
    }
  }, [appointment?.status]);
  
  useEffect(() => {
    const loadAppointmentData = async () => {
      try {
        setLoading(true);
        // Find the appointment
        const foundAppointment = await getAppointmentById(id);
        
        if (foundAppointment) {
          setAppointment(foundAppointment);
          // Get patient data
          const patientData = await getPatientById(foundAppointment.patientId);
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
      } catch (error) {
        console.error('Error loading appointment:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAppointmentData();
  }, [id, refreshKey, getAppointmentById, getPatientById]);
  
  // Function to handle completion with medical record
  const handleCompletionWithMedicalRecord = async (medicalData: MedicalRecord) => {
    if (!appointment) return;
    
    // Disable actions while in progress
    setActionInProgress(true);
    
    // Create combined note with medical record information
    const medicalRecordNote = `Complaint: ${medicalData.complaint}\nDiagnosis: ${medicalData.diagnosis}\nBlood Pressure: ${medicalData.bloodPressure}\nWeight: ${medicalData.weight}\nPrescription: ${medicalData.prescription}`;
    
    try {
      // Update appointment status to completed with medical record
      await updateAppointmentStatus(
        appointment.id,
        'completed',
        medicalRecordNote
      );
      
      // Show status changed animation
      setStatusChanged(true);
      
      if (animationRef.current) {
        animationRef.current.play();
      }
      
      // Reset medical record dialog
      setMedicalRecordDialogVisible(false);
      
      // Refresh appointment
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        setStatusChanged(false);
      }, 1500);
      
      // Show success message
      showToast('Appointment completed with medical record', 'success');
    } catch (error) {
      console.error('Error completing appointment:', error);
      setActionInProgress(false);
      showToast('Failed to complete appointment', 'error');
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
  const handleStatusChange = async () => {
    if (!appointment || !selectedStatus) return;
    
    // Disable actions while in progress
    setActionInProgress(true);
    
    try {
      // Update appointment status
      await updateAppointmentStatus(
        appointment.id,
        selectedStatus,
        statusChangeNotes
      );
      
      // Show status changed animation
      setStatusChanged(true);
      
      if (animationRef.current) {
        animationRef.current.play();
      }
      
      // Reset dialog
      setStatusChangeDialogVisible(false);
      setSelectedStatus(null);
      setStatusChangeNotes("");
      
      // Refresh appointment
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        setStatusChanged(false);
      }, 1500);
      
      // Show success message
      showToast(`Appointment ${selectedStatus}`, 'success');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setActionInProgress(false);
      showToast('Failed to update appointment status', 'error');
    }
  };
  
  const handleCompleteAppointment = () => {
    setCompleteDialogVisible(true);
  };

  const handleCancelAppointment = () => {
    handleStatusChange();
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
        <Stack.Screen options={{ title: "Loading Appointment" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 16 }}>Loading appointment details...</Text>
        </View>
      </ThemedView>
    );
  }
  
  if (!appointment || !patient) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Appointment Not Found" }} />
        <View style={styles.notFoundContainer}>
          <FontAwesome5 name="calendar-times" size={48} color="#9E9E9E" style={{ marginBottom: 16 }} />
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Appointment not found</ThemedText>
          <ThemedText style={{ textAlign: 'center', color: '#666' }}>
            The appointment you're looking for doesn't exist or has been removed.
          </ThemedText>
          <Button 
            mode="contained" 
            onPress={() => router.replace("/(tabs)/appointments")}
            style={{ marginTop: 24, borderRadius: 8 }}
            buttonColor="#757575"
          >
            Back to Appointments
          </Button>
        </View>
      </ThemedView>
    );
  }
  
  // Format appointment date
  const formattedDate = formatDate(appointment.date);
  const formattedDateTime = `${formattedDate} at ${appointment.time}`;
  
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
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 32}}>
        {/* Appointment Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <View 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.pending.bg },
                  statusChanged && styles.statusBadgeHighlight
                ]}
              >
                <ThemedText 
                  style={[
                    styles.statusText, 
                    { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.pending.text },
                    statusChanged && styles.statusTextHighlight
                  ]}
                >
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </ThemedText>
              </View>
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
            <ThemedText style={styles.patientDetail}>
              <FontAwesome5 name="id-card" size={14} color={STATUS_COLORS[appointment.status]?.accent || '#4CAF50'} style={styles.detailIcon} /> {patient.id}
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
            key={`med-record-form-${appointment.status}`}
            initialValues={{
              complaint: appointment.reason,
              bloodPressure: patient.bloodPressure || '',
              weight: patient.weight || '',
            }}
            onSubmit={handleCompletionWithMedicalRecord}
            submitButtonText="Complete Appointment"
            disabled={actionInProgress}
            loading={actionInProgress}
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
          
          {appointment.status === 'pending' && !actionInProgress && (
            <View style={styles.buttonGroup}>
              <Button 
                mode="outlined"
                icon={() => <FontAwesome5 name="times" size={16} color="#F44336" />}
                style={styles.cancelAppointmentButton}
                textColor="#F44336"
                onPress={() => openStatusChangeDialog('cancelled')}
                disabled={actionInProgress}
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
                disabled={actionInProgress}
              >
                Confirm
              </Button>
            </View>
          )}

          {appointment.status === 'confirmed' && !actionInProgress && (
            <View style={styles.buttonGroup}>
              <Button 
                mode="outlined"
                icon={() => <FontAwesome5 name="times" size={16} color="#F44336" />}
                style={styles.cancelAppointmentButton}
                textColor="#F44336"
                onPress={() => openStatusChangeDialog('cancelled')}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                icon={() => <FontAwesome5 name="check-circle" size={16} color="#FFFFFF" />}
                style={styles.confirmButton}
                buttonColor="#4CAF50"
                textColor="#FFFFFF"
                onPress={() => setCompleteDialogVisible(true)}
                disabled={actionInProgress}
              >
                Complete
              </Button>
            </View>
          )}
        </Surface>
      </ScrollView>
      
      {/* Status Change Dialog */}
      <Portal>
        <Dialog 
          visible={statusChangeDialogVisible} 
          onDismiss={() => !actionInProgress && setStatusChangeDialogVisible(false)}
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
              color={STATUS_COLORS[selectedStatus]?.accent || '#757575'} 
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
              disabled={actionInProgress}
            />
          </Dialog.Content>
          
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setStatusChangeDialogVisible(false)} 
              textColor="#757575"
              disabled={actionInProgress}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleStatusChange}
              mode="contained"
              buttonColor={STATUS_COLORS[selectedStatus]?.accent || '#757575'}
              style={{borderRadius: 8}}
              disabled={actionInProgress}
              loading={actionInProgress}
            >
              {selectedStatus === 'confirmed' ? 'Confirm' :
               selectedStatus === 'cancelled' ? 'Cancel Appointment' :
               selectedStatus === 'pending' ? 'Restore' : 'Change Status'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Complete Appointment Dialog */}
      <Portal>
        <Dialog 
          visible={completeDialogVisible} 
          onDismiss={() => !actionInProgress && setCompleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            <FontAwesome5 
              name="check-circle" 
              size={16} 
              color="#4CAF50" 
              style={{marginRight: 6}} 
            />
            Complete Appointment
          </Dialog.Title>
          
          <Dialog.Content>
            <ThemedText style={styles.dialogText}>
              Are you sure you want to mark this appointment as completed?
            </ThemedText>
            
            <TextInput
              label="Completion Notes (optional)"
              value={completeNotes}
              onChangeText={setCompleteNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              outlineColor="#E0E0E0"
              activeOutlineColor="#4CAF50"
              disabled={actionInProgress}
              placeholder="Enter any notes about the appointment outcome"
            />
          </Dialog.Content>
          
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setCompleteDialogVisible(false)} 
              textColor="#757575"
              disabled={actionInProgress}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleCompleteAppointment}
              mode="contained"
              buttonColor="#4CAF50"
              style={{borderRadius: 8}}
              disabled={actionInProgress}
              loading={actionInProgress}
            >
              Complete Appointment
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Status Change Animation */}
      {statusChanged && (
        <View style={styles.animationContainer}>
          <LottieView
            ref={animationRef}
            source={require('@/assets/animations/success.json')}
            autoPlay
            loop={false}
            style={styles.animation}
          />
          <Text style={styles.animationText}>
            Status updated successfully!
          </Text>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  headerContent: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeHighlight: {
    transform: [{scale: 1.1}],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  statusTextHighlight: {
    fontWeight: '700',
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
  animationContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  animation: {
    width: 150,
    height: 150,
  },
  animationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#4CAF50',
  },
}); 