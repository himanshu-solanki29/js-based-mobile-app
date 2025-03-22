import { StyleSheet, View, ScrollView, TextInput as RNTextInput, Alert, ActivityIndicator, Text, Animated, SafeAreaView, Platform } from "react-native";
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
  IconButton
} from 'react-native-paper';

import { 
  MOCK_APPOINTMENTS, 
  Appointment, 
  updateAppointmentStatus, 
  getPatientName,
  useAppointments
} from "@/utils/appointmentStore";
import { getPatientById } from "@/utils/patientStore";
import { AppointmentStatus } from "@/utils/types";
import { MedicalRecordForm } from "@/components/MedicalRecordForm";
import { MedicalRecordCard } from "@/components/MedicalRecordCard";
import { useGlobalToast } from "@/components/GlobalToastProvider";
import { globalEventEmitter } from '@/app/(tabs)/index';

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
  
  // Use the appointments hook to get live data
  const { appointments, loading: appointmentsLoading } = useAppointments();
  
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
  
  // Set up event listeners
  useEffect(() => {
    // Define the refresh handler
    const handleDataChange = () => {
      console.log('AppointmentDetailsScreen: Refreshing after data change');
      // Force a refresh by incrementing the refresh key
      setRefreshKey(prev => prev + 1);
    };
    
    // Add event listener
    globalEventEmitter.addListener('DATA_CHANGED', handleDataChange);
    
    // Remove event listener on cleanup
    return () => {
      globalEventEmitter.removeListener('DATA_CHANGED', handleDataChange);
    };
  }, []);
  
  // Load appointment data whenever the ID changes or when refreshKey changes
  useEffect(() => {
    const loadAppointment = async () => {
      if (!id || appointmentsLoading) return;
      
      setLoading(true);
      console.log(`[AppointmentDetails] Loading appointment with ID: ${id}, refreshKey: ${refreshKey}`);
      
      try {
        // Find the appointment using the ID from the parameters
        const foundAppointment = appointments.find(a => a.id === id);
        
        if (foundAppointment) {
          console.log(`[AppointmentDetails] Found appointment: ${foundAppointment.id}, status: ${foundAppointment.status}`);
          setAppointment(foundAppointment);
          
          // Get the patient data for this appointment
          const patient = await getPatientById(foundAppointment.patientId);
          if (patient) {
            console.log(`[AppointmentDetails] Found patient: ${patient.id}, name: ${patient.name}`);
            setPatient(patient);
            
            // Pre-fill medical record form with patient's current data
            setMedicalRecord(prev => ({
              ...prev,
              complaint: foundAppointment.reason || "", // Use reason as initial complaint
              bloodPressure: patient.bloodPressure || "",
              weight: patient.weight || "",
              diagnosis: "", // Start with empty diagnosis
              prescription: "" // Start with empty prescription
            }));
          } else {
            console.warn(`[AppointmentDetails] Patient not found for ID: ${foundAppointment.patientId}`);
            setPatient(null);
          }
        } else {
          console.error(`[AppointmentDetails] Appointment with ID ${id} not found in ${appointments.length} appointments`);
          showToast(`Appointment #${id} not found`, "error");
          setAppointment(null);
          setPatient(null);
        }
      } catch (error) {
        console.error('[AppointmentDetails] Error loading appointment data:', error);
        showToast("Failed to load appointment details", "error");
        setAppointment(null);
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [id, appointments, refreshKey, appointmentsLoading]);
  
  // Make sure UI updates immediately when appointment status changes
  useEffect(() => {
    if (appointment) {
      console.log("Appointment status:", appointment.status);
      setActionInProgress(false);
    }
  }, [appointment?.status]);
  
  // Function to handle completion with medical record
  const handleCompletionWithMedicalRecord = async (medicalData: MedicalRecord) => {
    if (!appointment) return;
    
    // Only allow completing confirmed appointments
    if (appointment.status !== 'confirmed') {
      showToast("Only confirmed appointments can be completed", "warning");
      return;
    }
    
    // Show confirmation dialog
    setMedicalRecord(medicalData);
    setCompleteDialogVisible(true);
  };

  // Function to execute the appointment completion
  const executeCompletion = async (medicalRecordData?: MedicalRecord) => {
    // Show status change animation
    setActionInProgress(true);
    
    try {
      const medicalRecordNote = medicalRecordData 
        ? `Complaint: ${medicalRecordData.complaint}\nDiagnosis: ${medicalRecordData.diagnosis}\nBlood Pressure: ${medicalRecordData.bloodPressure}\nWeight: ${medicalRecordData.weight}\nPrescription: ${medicalRecordData.prescription}`
        : appointment?.notes || '';
      
      // Update the appointment status through the storage service
      const updatedAppointment = await updateAppointmentStatus(
        appointment?.id || '',
        'completed',
        medicalRecordNote
      );
      
      if (updatedAppointment) {
        console.log('Successfully completed appointment:', updatedAppointment.id);
        console.log('New status:', updatedAppointment.status);
        
        // Update the local state immediately
        setAppointment({
          ...updatedAppointment
        });
        
        // Force a refresh of the component
        setRefreshKey(old => old + 1);
        
        // Show animation for status change
        setStatusChanged(true);
        setTimeout(() => setStatusChanged(false), 2000);
        
        // Show success notification
        showToast("Appointment completed successfully", "success");
      } else {
        console.error('Failed to complete appointment - no appointment returned');
        showToast("Failed to complete appointment. Please try again.", "error");
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      showToast("An error occurred while completing the appointment.", "error");
    } finally {
      setActionInProgress(false);
      setCompleteDialogVisible(false);
    }
  };
  
  // Function to handle general status change
  const handleStatusChange = async (newStatus: AppointmentStatus, notes?: string) => {
    // Show status change animation
    setActionInProgress(true);
    
    try {
      // Update the appointment status through the storage service
      const updatedAppointment = await updateAppointmentStatus(
        appointment?.id || '',
        newStatus,
        notes || appointment?.notes
      );
      
      if (updatedAppointment) {
        console.log('Successfully updated appointment status:', updatedAppointment.id);
        console.log('New status:', updatedAppointment.status);
        
        // Update the local state immediately
        setAppointment({
          ...updatedAppointment
        });
        
        // Force a refresh of the component
        setRefreshKey(old => old + 1);
        
        // Show success notification with appropriate message
        let message = '';
        if (newStatus === 'confirmed') {
          message = 'Appointment confirmed successfully.';
        } else if (newStatus === 'cancelled') {
          message = 'Appointment cancelled successfully.';
        } else if (newStatus === 'pending') {
          message = 'Appointment marked as pending.';
        } else {
          message = `Appointment status updated to ${newStatus}.`;
        }
        
        showToast(message, "success");
      } else {
        console.error('Failed to update appointment status - no appointment returned');
        showToast("Failed to update appointment status. Please try again.", "error");
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      showToast("An error occurred while updating the appointment.", "error");
    } finally {
      setActionInProgress(false);
      setStatusChangeDialogVisible(false);
    }
  };
  
  const handleCompleteAppointment = async () => {
    if (!appointment) return;
    
    // Disable actions while in progress
    setActionInProgress(true);
    
    try {
      // Update appointment status
      const updatedAppointment = await updateAppointmentStatus(
        appointment.id,
        'completed',
        completeNotes
      );
      
      if (updatedAppointment) {
        // Show status changed animation
        setStatusChanged(true);
        setTimeout(() => setStatusChanged(false), 2000);
        
        // Update local state
        setAppointment(updatedAppointment);
        
        // Trigger a refresh to make sure all components using the appointments data are updated
        setRefreshKey(prev => prev + 1);
        
        // Show success notification
        showToast(`Appointment has been completed`, "success");
        
        // Reset form state
        setCompleteDialogVisible(false);
        setCompleteNotes("");
      } else {
        // Show error notification
        showToast("Failed to update appointment status", "error");
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      showToast("Failed to update appointment status", "error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelAppointment = () => {
    openStatusChangeDialog('cancelled');
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
  const formattedDate = formatDate(appointment?.date || '');
  const formattedDateTime = appointment ? `${formattedDate} at ${appointment.time}` : '';
  
  // Add more logging to debug the UI rendering
  console.log("Rendering appointment details:", {
    id: appointment?.id,
    status: appointment?.status,
    hasNotes: !!appointment?.notes,
    isConfirmed: appointment?.status === 'confirmed',
    isCompleted: appointment?.status === 'completed',
    isPending: appointment?.status === 'pending',
    refreshKey
  });
  
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
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{paddingBottom: Platform.OS === 'ios' ? 100 : 80}}
      >
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
            
            <View style={styles.patientDetailsGrid}>
              {/* Age and gender */}
              <View style={styles.patientDetailItem}>
                <View style={styles.patientDetailIconWrapper}>
                  <FontAwesome5 name="user-alt" size={14} color="#4CAF50" />
                </View>
                <ThemedText style={styles.patientDetailText}>
                  {patient.age} years • {patient.gender}
                </ThemedText>
              </View>
              
              {/* Phone */}
              <View style={styles.patientDetailItem}>
                <View style={styles.patientDetailIconWrapper}>
                  <FontAwesome5 name="phone" size={14} color="#4CAF50" />
                </View>
                <ThemedText style={styles.patientDetailText}>
                  {patient.phone}
                </ThemedText>
              </View>
              
              {/* Email */}
              <View style={styles.patientDetailItem}>
                <View style={styles.patientDetailIconWrapper}>
                  <FontAwesome5 name="envelope" size={14} color="#4CAF50" />
                </View>
                <ThemedText style={styles.patientDetailText}>
                  {patient.email}
                </ThemedText>
              </View>
              
              {/* ID */}
              <View style={styles.patientDetailItem}>
                <View style={styles.patientDetailIconWrapper}>
                  <FontAwesome5 
                    name="id-card" 
                    size={14} 
                    color={STATUS_COLORS[appointment.status]?.accent || '#4CAF50'} 
                  />
                </View>
                <ThemedText style={styles.patientDetailText}>
                  {patient.id}
                </ThemedText>
              </View>
            </View>
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
        {appointment?.status === 'completed' && appointment.notes && (
          <MedicalRecordCard notes={appointment.notes} />
        )}
        
        {/* Medical Record Form for confirmed appointments ONLY */}
        {appointment?.status === 'confirmed' && (
          <MedicalRecordForm
            key={`med-record-form-${appointment.status}-${refreshKey}`}
            initialValues={{
              complaint: appointment.reason,
              bloodPressure: patient?.bloodPressure || '',
              weight: patient?.weight || '',
            }}
            onSubmit={(data) => {
              // Just capture the data
              setMedicalRecord(data);
            }}
            disabled={false}  // Make fields editable
            loading={actionInProgress}
            hideSubmitButton={true}  // Hide the submit button
          />
        )}
      </ScrollView>
      
      {/* Fixed Footer for Actions */}
      <SafeAreaView style={styles.footerContainer}>
        <View style={styles.footerContent}>
          <Button 
            mode="outlined"
            icon={() => <FontAwesome5 name="arrow-left" size={16} color="#757575" />}
            style={styles.cancelButton}
            textColor="#757575"
            onPress={() => router.back()}
          >
            Back
          </Button>
          
          {/* Only show pending actions if the appointment is pending */}
          {appointment?.status === 'pending' && !actionInProgress && (
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
          
          {/* Only show completion action if the appointment is confirmed */}
          {appointment?.status === 'confirmed' && !actionInProgress && (
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
                onPress={() => setCompleteDialogVisible(true)}
                mode="contained" 
                buttonColor="#4CAF50"
                textColor="white"
                style={styles.actionButton}
                icon="check-circle"
                disabled={appointment?.status !== 'confirmed' || actionInProgress}
              >
                Complete
              </Button>
            </View>
          )}
        </View>
      </SafeAreaView>
      
      {/* Dialog for status change */}
      <Dialog visible={statusChangeDialogVisible} onDismiss={() => !actionInProgress && setStatusChangeDialogVisible(false)} style={styles.dialog}>
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
            onPress={() => handleStatusChange(selectedStatus, statusChangeNotes)}
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
      
      {/* Complete Appointment Confirmation Dialog */}
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
            Are you sure you want to complete this appointment with the medical record information you've entered?
          </ThemedText>
          
          <View style={styles.medicalSummary}>
            <ThemedText style={styles.medicalSummaryItem}>
              <ThemedText style={styles.medicalSummaryLabel}>Complaint:</ThemedText> {medicalRecord.complaint || 'None'}
            </ThemedText>
            <ThemedText style={styles.medicalSummaryItem}>
              <ThemedText style={styles.medicalSummaryLabel}>Diagnosis:</ThemedText> {medicalRecord.diagnosis || 'None'}
            </ThemedText>
            <ThemedText style={styles.medicalSummaryItem}>
              <ThemedText style={styles.medicalSummaryLabel}>Blood Pressure:</ThemedText> {medicalRecord.bloodPressure || 'Not recorded'}
            </ThemedText>
            <ThemedText style={styles.medicalSummaryItem}>
              <ThemedText style={styles.medicalSummaryLabel}>Weight:</ThemedText> {medicalRecord.weight || 'Not recorded'}
            </ThemedText>
            <ThemedText style={styles.medicalSummaryItem}>
              <ThemedText style={styles.medicalSummaryLabel}>Prescription:</ThemedText> {medicalRecord.prescription || 'None'}
            </ThemedText>
          </View>
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
            onPress={() => executeCompletion(medicalRecord)}
            mode="contained"
            buttonColor="#4CAF50"
            style={{borderRadius: 8}}
            disabled={actionInProgress}
            loading={actionInProgress}
          >
            Complete
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
    marginBottom: 16,
  },
  patientDetailsGrid: {
    width: '100%',
    marginBottom: 8,
  },
  patientDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  patientDetailIconWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  patientDetailText: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    minWidth: 120,
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
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 8,
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
  medicalSummary: {
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  medicalSummaryItem: {
    marginBottom: 4,
    fontSize: 14,
  },
  medicalSummaryLabel: {
    fontWeight: 'bold',
    color: '#555',
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
    padding: 16,
  },
}); 