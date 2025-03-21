import { StyleSheet, View, ScrollView, TextInput as RNTextInput, Alert, TouchableOpacity } from "react-native";
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
  ActivityIndicator,
  Text,
  Card
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useGlobalToast } from "@/components/GlobalToastProvider";
import LottieView from 'lottie-react-native';
import useAppointmentStorage from '@/utils/useAppointmentStorage';
import usePatientStorage from '@/utils/usePatientStorage';
import { AppointmentStatus } from '@/utils/types';

// Define the Appointment interface directly in this file to avoid import issues
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  medicalRecord?: MedicalRecord;
}

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
  const params = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const { showToast } = useGlobalToast();
  
  // Get storage hooks
  const { getAppointmentById, updateAppointmentStatus } = useAppointmentStorage();
  const { getPatientById } = usePatientStorage();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
  
  // New state for completing an appointment
  const [completeDialogVisible, setCompleteDialogVisible] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  
  // Success animation state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  
  // Set component mount state
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  
  // This effect is triggered when appointment status changes and updates all states
  useEffect(() => {
    if (appointment && isMounted) {
      // Reset action in progress when appointment status changes
      setActionInProgress(false);
    }
  }, [appointment?.status, isMounted]);
  
  useEffect(() => {
    const loadAppointmentData = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        // Find the appointment
        const foundAppointment = await getAppointmentById(id);
        
        if (foundAppointment && isMounted) {
          setAppointment(foundAppointment);
          // Get patient data
          const patientData = await getPatientById(foundAppointment.patientId);
          if (patientData && isMounted) {
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
        if (isMounted) {
          showToast('Error loading appointment details', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadAppointmentData();
  }, [id, refreshKey, isMounted]);
  
  // Function to handle completion with medical record
  const handleCompletionWithMedicalRecord = async (medicalData: MedicalRecord) => {
    if (!appointment || !isMounted) return;
    
    try {
      setActionInProgress(true);
      
      // Show success animation
      setShowSuccessAnimation(true);
      
      // Update appointment status with medical record data
      await updateAppointmentStatus(
        appointment.id,
        'completed',
        JSON.stringify(medicalData)
      );
      
      // Close dialog
      setMedicalRecordDialogVisible(false);
      
      // Update local state
      if (isMounted) {
        setAppointment({
          ...appointment,
          status: 'completed',
          medicalRecord: medicalData
        });
      
        setTimeout(() => {
          if (isMounted) {
            setShowSuccessAnimation(false);
            // Show toast notification
            showToast('Appointment completed successfully', 'success');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      if (isMounted) {
        showToast('Error completing appointment', 'error');
      }
    } finally {
      if (isMounted) {
        setActionInProgress(false);
      }
    }
  };
  
  // Function to change status
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment || !isMounted) return;
    
    try {
      setActionInProgress(true);
      
      // If we're completing the appointment, show the medical record form instead
      if (newStatus === 'completed') {
        setCompleteDialogVisible(true);
        setStatusChangeDialogVisible(false);
        return;
      }
      
      // Update appointment status
      await updateAppointmentStatus(
        appointment.id,
        newStatus,
        statusChangeNotes
      );
      
      // Close dialog
      setStatusChangeDialogVisible(false);
      
      // Update local state
      if (isMounted) {
        setAppointment({
          ...appointment,
          status: newStatus
        });
      
        // Show toast notification
        showToast(`Appointment ${newStatus} successfully`, 'success');
      }
      
    } catch (error) {
      console.error('Error changing appointment status:', error);
      if (isMounted) {
        showToast('Error changing appointment status', 'error');
      }
    } finally {
      if (isMounted) {
        setActionInProgress(false);
      }
    }
  };
  
  // Function to handle simple completion (without medical record)
  const handleSimpleCompletion = async () => {
    if (!appointment || !isMounted) return;
    
    try {
      setActionInProgress(true);
      
      // Show success animation
      setShowSuccessAnimation(true);
      
      // Update appointment status
      await updateAppointmentStatus(
        appointment.id,
        'completed',
        completeNotes
      );
      
      // Close dialog
      setCompleteDialogVisible(false);
      
      // Update local state
      if (isMounted) {
        setAppointment({
          ...appointment,
          status: 'completed'
        });
      
        setTimeout(() => {
          if (isMounted) {
            setShowSuccessAnimation(false);
            // Show toast notification
            showToast('Appointment completed successfully', 'success');
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error completing appointment:', error);
      if (isMounted) {
        showToast('Error completing appointment', 'error');
      }
    } finally {
      if (isMounted) {
        setActionInProgress(false);
      }
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: "Appointment Details",
            headerShown: true
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{marginTop: 16}}>Loading appointment details...</Text>
        </View>
      </ThemedView>
    );
  }

  // Render not found state
  if (!appointment) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Appointment Details" }} />
        <View style={styles.loadingContainer}>
          <Text>Appointment not found</Text>
          <Button mode="contained" onPress={() => router.back()} style={{marginTop: 16}}>
            Go Back
          </Button>
        </View>
      </ThemedView>
    );
  }

  // Get status colors
  const statusColors = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "Appointment Details",
          headerRight: () => (
            <Appbar.Action 
              icon="dots-vertical" 
              onPress={() => {
                setSelectedStatus(null);
                setStatusChangeDialogVisible(true);
              }} 
            />
          ),
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Show loading overlay when actions are in progress */}
        {actionInProgress && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        {/* Main appointment details card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.dateTimeSection}>
                <View style={styles.dateRow}>
                  <FontAwesome5 name="calendar-alt" size={18} color={statusColors.accent} style={styles.icon} />
                  <ThemedText style={styles.dateText}>{formatDate(appointment.date)}</ThemedText>
                </View>
                <View style={styles.timeRow}>
                  <FontAwesome5 name="clock" size={18} color={statusColors.accent} style={styles.icon} />
                  <ThemedText style={styles.timeText}>{appointment.time}</ThemedText>
                </View>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                  {appointment.status.toUpperCase()}
                </ThemedText>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Patient information */}
            <View style={styles.patientSection}>
              <View style={styles.patientHeader}>
                <FontAwesome5 name="user" size={18} color={statusColors.accent} style={styles.icon} />
                <ThemedText style={styles.sectionTitle}>Patient</ThemedText>
              </View>
              
              <TouchableOpacity 
                style={styles.patientCard}
                onPress={() => router.push(`/patient/${appointment.patientId}`)}
              >
                <View style={styles.patientNameRow}>
                  <ThemedText style={styles.patientName}>{appointment.patientName}</ThemedText>
                  <FontAwesome5 name="chevron-right" size={16} color="#aaa" />
                </View>
                
                {patient && (
                  <View style={styles.patientDetails}>
                    <Text style={styles.patientDetail}>
                      {patient.gender}, {patient.age} years
                    </Text>
                    {patient.phone && (
                      <Text style={styles.patientDetail}>
                        <FontAwesome5 name="phone" size={12} /> {patient.phone}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Divider style={styles.divider} />

            {/* Reason for visit section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FontAwesome5 name="notes-medical" size={18} color={statusColors.accent} style={styles.icon} />
                <ThemedText style={styles.sectionTitle}>Reason for Visit</ThemedText>
              </View>
              <ThemedText style={styles.reasonText}>{appointment.reason}</ThemedText>
            </View>

            {appointment.notes && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="clipboard" size={18} color={statusColors.accent} style={styles.icon} />
                    <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
                  </View>
                  <ThemedText style={styles.notesText}>{appointment.notes}</ThemedText>
                </View>
              </>
            )}

            {/* Medical Record Section - Only visible for completed appointments */}
            {appointment.status === 'completed' && appointment.medicalRecord && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="file-medical-alt" size={18} color={statusColors.accent} style={styles.icon} />
                    <ThemedText style={styles.sectionTitle}>Medical Record</ThemedText>
                  </View>
                  
                  <View style={styles.medicalRecord}>
                    <View style={styles.medicalRecordItem}>
                      <ThemedText style={styles.medicalRecordLabel}>Chief Complaint:</ThemedText>
                      <ThemedText style={styles.medicalRecordValue}>{appointment.medicalRecord.complaint}</ThemedText>
                    </View>
                    
                    <View style={styles.medicalRecordItem}>
                      <ThemedText style={styles.medicalRecordLabel}>Diagnosis:</ThemedText>
                      <ThemedText style={styles.medicalRecordValue}>{appointment.medicalRecord.diagnosis}</ThemedText>
                    </View>
                    
                    <View style={styles.medicalRecordRow}>
                      <View style={styles.medicalRecordItem}>
                        <ThemedText style={styles.medicalRecordLabel}>Blood Pressure:</ThemedText>
                        <ThemedText style={styles.medicalRecordValue}>{appointment.medicalRecord.bloodPressure}</ThemedText>
                      </View>
                      
                      <View style={styles.medicalRecordItem}>
                        <ThemedText style={styles.medicalRecordLabel}>Weight:</ThemedText>
                        <ThemedText style={styles.medicalRecordValue}>{appointment.medicalRecord.weight}</ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.medicalRecordItem}>
                      <ThemedText style={styles.medicalRecordLabel}>Prescription:</ThemedText>
                      <ThemedText style={styles.medicalRecordValue}>{appointment.medicalRecord.prescription}</ThemedText>
                    </View>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons - Only show if not cancelled or completed */}
        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <View style={styles.actionButtonsContainer}>
            {appointment.status === 'pending' && (
              <Button 
                mode="contained" 
                icon={() => <FontAwesome5 name="check" size={16} color="white" />}
                style={[styles.actionButton, { backgroundColor: STATUS_COLORS.confirmed.accent }]}
                onPress={() => {
                  setSelectedStatus('confirmed');
                  setStatusChangeDialogVisible(true);
                }}
              >
                Confirm
              </Button>
            )}
            
            <Button 
              mode="contained" 
              icon={() => <FontAwesome5 name="check-double" size={16} color="white" />}
              style={[styles.actionButton, { backgroundColor: STATUS_COLORS.completed.accent }]}
              onPress={() => {
                setMedicalRecordDialogVisible(true);
              }}
            >
              Complete & Add Medical Record
            </Button>
            
            <Button 
              mode="contained" 
              icon={() => <FontAwesome5 name="times" size={16} color="white" />}
              style={[styles.actionButton, { backgroundColor: STATUS_COLORS.cancelled.accent }]}
              onPress={() => {
                setSelectedStatus('cancelled');
                setStatusChangeDialogVisible(true);
              }}
            >
              Cancel Appointment
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Status Change Dialog */}
      <Portal>
        <Dialog visible={statusChangeDialogVisible} onDismiss={() => setStatusChangeDialogVisible(false)}>
          <Dialog.Title>Change Appointment Status</Dialog.Title>
          <Dialog.Content>
            <Text style={{marginBottom: 16}}>Select new status:</Text>
            
            <SegmentedButtons
              value={selectedStatus || ''}
              onValueChange={(value) => setSelectedStatus(value as AppointmentStatus)}
              buttons={[
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              style={{marginBottom: 16}}
            />
            
            <TextInput
              label="Notes (optional)"
              value={statusChangeNotes}
              onChangeText={setStatusChangeNotes}
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatusChangeDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={() => selectedStatus && handleStatusChange(selectedStatus)}
              disabled={!selectedStatus}
              mode="contained"
            >
              Update Status
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Medical Record Form Dialog */}
      <Portal>
        <Dialog 
          visible={medicalRecordDialogVisible} 
          onDismiss={() => setMedicalRecordDialogVisible(false)}
          style={styles.medicalRecordDialog}
        >
          <Dialog.Title>Complete Appointment</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Chief Complaint</Text>
                <TextInput
                  value={medicalRecord.complaint}
                  onChangeText={(text) => setMedicalRecord({...medicalRecord, complaint: text})}
                  mode="outlined"
                  style={styles.formInput}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Diagnosis</Text>
                <TextInput
                  value={medicalRecord.diagnosis}
                  onChangeText={(text) => setMedicalRecord({...medicalRecord, diagnosis: text})}
                  mode="outlined"
                  style={styles.formInput}
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
                  <Text style={styles.formLabel}>Blood Pressure</Text>
                  <TextInput
                    value={medicalRecord.bloodPressure}
                    onChangeText={(text) => setMedicalRecord({...medicalRecord, bloodPressure: text})}
                    mode="outlined"
                    style={styles.formInput}
                    placeholder="e.g. 120/80"
                  />
                </View>
                
                <View style={[styles.formGroup, {flex: 1}]}>
                  <Text style={styles.formLabel}>Weight</Text>
                  <TextInput
                    value={medicalRecord.weight}
                    onChangeText={(text) => setMedicalRecord({...medicalRecord, weight: text})}
                    mode="outlined"
                    style={styles.formInput}
                    placeholder="e.g. 70 kg"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prescription</Text>
                <TextInput
                  value={medicalRecord.prescription}
                  onChangeText={(text) => setMedicalRecord({...medicalRecord, prescription: text})}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={[styles.formInput, styles.textArea]}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setMedicalRecordDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained"
              onPress={() => handleCompletionWithMedicalRecord(medicalRecord)}
              disabled={!medicalRecord.diagnosis || !medicalRecord.complaint}
            >
              Complete Appointment
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Simple Completion Dialog */}
      <Portal>
        <Dialog 
          visible={completeDialogVisible} 
          onDismiss={() => setCompleteDialogVisible(false)}
        >
          <Dialog.Title>Complete Appointment</Dialog.Title>
          <Dialog.Content>
            <Text style={{marginBottom: 16}}>Add notes about this appointment:</Text>
            
            <TextInput
              label="Notes (optional)"
              value={completeNotes}
              onChangeText={setCompleteNotes}
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCompleteDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={handleSimpleCompletion}
              mode="contained"
            >
              Complete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <View style={styles.animationOverlay}>
          <View style={styles.animationContainer}>
            <Text style={styles.successText}>Appointment Completed!</Text>
            {/* We would typically use a Lottie animation here */}
            <FontAwesome5 name="check-circle" size={80} color="#4CAF50" />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTimeSection: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 16,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  divider: {
    marginVertical: 16,
  },
  patientSection: {
    marginBottom: 16,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  patientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  section: {
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  medicalRecord: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  medicalRecordItem: {
    marginBottom: 12,
  },
  medicalRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicalRecordLabel: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  medicalRecordValue: {
    fontSize: 16,
  },
  actionButtonsContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  medicalRecordDialog: {
    maxHeight: '80%',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  animationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  animationContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E7D32',
  },
}); 