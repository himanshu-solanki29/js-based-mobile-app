import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { formatDate } from '@/utils/dateFormat';
import useAppointmentStorage from '@/utils/useAppointmentStorage';
import { getPatientById } from '@/utils/patientStore';
import usePatientStorage from '@/utils/usePatientStorage';
import { Appointment, AppointmentStatus } from '@/utils/appointmentStore';
import { Patient } from '@/utils/patientStore';
import { 
  Badge, 
  Button, 
  Card, 
  Divider, 
  IconButton, 
  Title, 
  Paragraph, 
  Surface, 
  Text,
  FAB,
  Dialog,
  TextInput as PaperTextInput,
  Menu,
  TouchableRipple,
  Portal,
  useTheme
} from 'react-native-paper';
import { MedicalRecordCard } from "@/components/MedicalRecordCard";
import { useGlobalToast } from "@/components/GlobalToastProvider";
import logStorageService from '@/utils/logStorageService';

// Status color mapping
const STATUS_COLORS = {
  confirmed: {
    bg: '#E8F5E9',
    text: '#2E7D32',
    accent: '#4CAF50'
  },
  pending: {
    bg: '#FFF8E1',
    text: '#F57F17',
    accent: '#FFC107'
  },
  cancelled: {
    bg: '#FFEBEE',
    text: '#C62828',
    accent: '#F44336'
  },
  completed: {
    bg: '#E3F2FD',
    text: '#1565C0',
    accent: '#2196F3'
  }
};

export default function AppointmentDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useGlobalToast();
  
  // State management
  const [patient, setPatient] = useState<Patient | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [completionDialogVisible, setCompletionDialogVisible] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Get appointment details
  const { 
    appointments, 
    loading, 
    error, 
    updateAppointmentStatus
  } = useAppointmentStorage();
  
  // Find the appointment
  const appointment = appointments.find(a => a.id === id);
  
  // Load patient data when appointment is found
  useEffect(() => {
    const loadPatientData = async () => {
      if (appointment) {
        try {
          const patientData = await getPatientById(appointment.patientId);
          setPatient(patientData);
        } catch (error) {
          console.error('Error loading patient data:', error);
          showToast('Error loading patient information', 'error');
        }
      }
    };
    
    loadPatientData();
  }, [appointment, refreshTrigger]);
  
  // If appointment not found
  if (!loading && !appointment) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Appointment not found</ThemedText>
        <Button 
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </ThemedView>
    );
  }
  
  // Function to get readable status text
  const getStatusText = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return status;
    }
  };
  
  // Handle appointment status change
  const handleStatusChange = async (newStatus: AppointmentStatus, remarks?: string) => {
    if (!appointment) return;
    
    setActionInProgress(true);
    
    try {
      // Update appointment status
      const updatedAppointment = await updateAppointmentStatus(appointment.id, newStatus, remarks);
      
      if (updatedAppointment) {
        // Show toast
        const message = `Appointment ${getStatusText(newStatus).toLowerCase()} successfully`;
        showToast(message, 'success');
        
        // Log the operation
        logStorageService.addLog({
          operation: `UPDATE_APPOINTMENT_STATUS`,
          status: 'success',
          details: `Updated appointment #${appointment.id} status to ${newStatus}${remarks ? ` with remarks: ${remarks}` : ''}`
        });
        
        // Close dialogs
        setCompletionDialogVisible(false);
        setCancelDialogVisible(false);
        
        // Clear form inputs
        setCompletionRemarks('');
        setCancelReason('');
        
        // Force refresh
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error('Failed to update appointment status - no appointment returned');
        showToast("Failed to update appointment status. Please try again.", "error");
        
        // Log the error
        logStorageService.addLog({
          operation: `UPDATE_APPOINTMENT_STATUS`,
          status: 'error',
          details: `Error updating appointment #${appointment.id}: No appointment returned`
        });
      }
    } catch (error) {
      console.error(`Error updating appointment status to ${newStatus}:`, error);
      showToast(`Failed to update appointment status`, 'error');
      
      // Log the error
      logStorageService.addLog({
        operation: `UPDATE_APPOINTMENT_STATUS`,
        status: 'error',
        details: `Error updating appointment #${appointment.id} status: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Handle appointment cancellation
  const handleCancelAppointment = () => {
    handleStatusChange('cancelled', cancelReason);
  };
  
  // Handle appointment completion
  const handleCompleteAppointment = () => {
    handleStatusChange('completed', completionRemarks);
  };
  
  // Handle appointment confirmation
  const handleConfirmAppointment = () => {
    handleStatusChange('confirmed');
  };
  
  return (
    <ThemedView style={styles.container}>
      {appointment && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Appointment Card */}
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.appointmentInfo}>
                  <Title style={styles.title}>{appointment.reason}</Title>
                  <Paragraph style={styles.date}>
                    {formatDate(appointment.date)} • {appointment.time}
                  </Paragraph>
                </View>
                <Badge 
                  style={{
                    backgroundColor: STATUS_COLORS[appointment.status].bg,
                    color: STATUS_COLORS[appointment.status].text
                  }}
                >
                  {getStatusText(appointment.status)}
                </Badge>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Patient Info */}
              {patient && (
                <TouchableRipple
                  onPress={() => router.push(`/patient/${patient.id}`)}
                  style={styles.patientSection}
                >
                  <View style={styles.patientInfo}>
                    <View style={styles.patientHeader}>
                      <Avatar.Icon 
                        size={40} 
                        icon="account" 
                        style={{ backgroundColor: '#E3F2FD' }}
                        color="#2196F3"
                      />
                      <View style={styles.patientNameSection}>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        <Text style={styles.patientDetails}>
                          {patient.age} years • {patient.gender}
                        </Text>
                      </View>
                    </View>
                    <IconButton
                      icon="chevron-right"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                </TouchableRipple>
              )}
              
              <Divider style={styles.divider} />
              
              {/* Notes Section */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Surface style={styles.notesSurface}>
                  <Text style={styles.notesText}>
                    {appointment.notes || 'No notes for this appointment.'}
                  </Text>
                </Surface>
              </View>
              
              {/* Actions Section */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionButtons}>
                  {appointment.status === 'pending' && (
                    <Button 
                      mode="contained" 
                      style={[styles.actionButton, { backgroundColor: STATUS_COLORS.confirmed.accent }]}
                      onPress={handleConfirmAppointment}
                      loading={actionInProgress}
                      disabled={actionInProgress}
                    >
                      Confirm
                    </Button>
                  )}
                  
                  {['pending', 'confirmed'].includes(appointment.status) && (
                    <Button 
                      mode="contained" 
                      style={[styles.actionButton, { backgroundColor: STATUS_COLORS.completed.accent }]}
                      onPress={() => setCompletionDialogVisible(true)}
                      loading={actionInProgress}
                      disabled={actionInProgress}
                    >
                      Complete
                    </Button>
                  )}
                  
                  {['pending', 'confirmed'].includes(appointment.status) && (
                    <Button 
                      mode="contained" 
                      style={[styles.actionButton, { backgroundColor: STATUS_COLORS.cancelled.accent }]}
                      onPress={() => setCancelDialogVisible(true)}
                      loading={actionInProgress}
                      disabled={actionInProgress}
                    >
                      Cancel
                    </Button>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* FAB for Back Navigation */}
          <FAB
            icon="arrow-left"
            style={styles.fab}
            onPress={() => router.back()}
            color="white"
          />
          
          {/* Completion Dialog */}
          <Portal>
            <Dialog
              visible={completionDialogVisible}
              onDismiss={() => setCompletionDialogVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title>Complete Appointment</Dialog.Title>
              <Dialog.Content>
                <PaperTextInput
                  label="Medical Record Notes"
                  placeholder="Enter completion notes, diagnosis, etc."
                  value={completionRemarks}
                  onChangeText={setCompletionRemarks}
                  multiline
                  numberOfLines={5}
                  mode="outlined"
                  style={styles.textInput}
                />
                <Text style={styles.helpText}>
                  Add information like diagnosis, prescription, follow-up details
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setCompletionDialogVisible(false)}>Cancel</Button>
                <Button 
                  onPress={handleCompleteAppointment}
                  loading={actionInProgress}
                  disabled={actionInProgress}
                >
                  Complete
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
          
          {/* Cancellation Dialog */}
          <Portal>
            <Dialog
              visible={cancelDialogVisible}
              onDismiss={() => setCancelDialogVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title>Cancel Appointment</Dialog.Title>
              <Dialog.Content>
                <PaperTextInput
                  label="Cancellation Reason"
                  placeholder="Enter reason for cancellation"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  mode="outlined"
                  style={styles.textInput}
                />
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setCancelDialogVisible(false)}>Back</Button>
                <Button 
                  onPress={handleCancelAppointment}
                  loading={actionInProgress}
                  disabled={actionInProgress}
                >
                  Cancel Appointment
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  backButton: {
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appointmentInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#757575',
  },
  divider: {
    marginVertical: 16,
  },
  patientSection: {
    borderRadius: 8,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientNameSection: {
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientDetails: {
    fontSize: 14,
    color: '#757575',
  },
  notesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesSurface: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    marginVertical: 8,
    paddingHorizontal: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    left: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  dialog: {
    borderRadius: 12,
  },
  textInput: {
    marginBottom: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
}); 