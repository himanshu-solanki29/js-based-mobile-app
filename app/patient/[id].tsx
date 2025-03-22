import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, Link, Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { formatDate } from '@/utils/dateFormat';
import { usePatientStorage, getAgeFromBirthdate } from '@/utils/usePatientStorage';
import { useAppointmentStorage } from '@/utils/useAppointmentStorage';
import { Appointment } from '@/utils/appointmentStore';
import { Patient } from '@/utils/patientStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Button, IconButton, Avatar, Card, Title, Paragraph, Divider, Badge, ActivityIndicator, FAB, Menu, Portal, Dialog, TextInput as PaperTextInput, useTheme } from 'react-native-paper';
import { ContactInfoFields, updateContactInfo } from '@/components/ContactInfoFields';
import { MedicalHistoryFields, updateMedicalHistory } from '@/components/MedicalHistoryFields';
import PatientAppointmentCard from '@/components/PatientAppointmentCard';
import { logStorageService } from '@/utils/logStorageService';

export default function PatientDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useGlobalToast();
  
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'notes' | 'edit'>('overview');
  const [newNote, setNewNote] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get patient details
  const { patients, loading: patientsLoading, error: patientsError, updatePatient, deletePatient } = usePatientStorage();
  const { appointments, loading: appointmentsLoading, error: appointmentsError } = useAppointmentStorage();
  
  // Find the patient
  const patient = patients.find(p => p.id === id);
  
  // Filter appointments for this patient
  const patientAppointments = appointments.filter(appointment => appointment.patientId === id);
  
  // Sort appointments by date (most recent first)
  const sortedAppointments = [...patientAppointments].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
  
  const [editedPatient, setEditedPatient] = useState<Patient | null>(null);
  
  // Initialize edited patient when patient data is available
  useEffect(() => {
    if (patient) {
      setEditedPatient({...patient});
    }
  }, [patient]);
  
  // If patient not found
  if (!patientsLoading && !patient) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Patient not found</ThemedText>
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
  
  // Handle saving patient edits
  const handleSavePatient = async () => {
    if (editedPatient) {
      try {
        await updatePatient(editedPatient);
        showToast('Patient information updated successfully', 'success');
        setEditMode(false);
        setActiveTab('overview');
        
        // Log the operation
        logStorageService.addLog({
          operation: 'UPDATE_PATIENT',
          status: 'success',
          details: `Updated patient: ${editedPatient.firstName} ${editedPatient.lastName} (ID: ${editedPatient.id})`
        });
      } catch (error) {
        console.error('Error updating patient:', error);
        showToast('Failed to update patient information', 'error');
        
        // Log the error
        logStorageService.addLog({
          operation: 'UPDATE_PATIENT',
          status: 'error',
          details: `Error updating patient: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  };
  
  // Handle deleting a patient
  const handleDeletePatient = async () => {
    if (patient) {
      try {
        await deletePatient(patient.id);
        showToast('Patient deleted successfully', 'success');
        
        // Log the operation
        logStorageService.addLog({
          operation: 'DELETE_PATIENT',
          status: 'success',
          details: `Deleted patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`
        });
        
        // Navigate back
        router.back();
      } catch (error) {
        console.error('Error deleting patient:', error);
        showToast('Failed to delete patient', 'error');
        
        // Log the error
        logStorageService.addLog({
          operation: 'DELETE_PATIENT',
          status: 'error',
          details: `Error deleting patient: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    setDeleteDialogVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />
      
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction color="white" onPress={() => router.back()} />
        <Appbar.Content 
          title="Patient Profile" 
          titleStyle={styles.appBarTitle}
        />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Patient Profile Card */}
        <Surface style={styles.profileCard} elevation={2}>
          <View style={styles.profileContent}>
            <View style={styles.avatarSection}>
              <Avatar.Icon
                size={64}
                icon="account"
                style={{ backgroundColor: '#FFFFFF' }}
                color="#4CAF50"
              />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <View style={styles.patientMeta}>
                <Text style={styles.metaText}>
                  <FontAwesome5 name="birthday-cake" size={12} color="#757575" style={{marginRight: 4}} /> {patient.age} yrs
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>
                  <FontAwesome5 name="venus-mars" size={12} color="#757575" style={{marginRight: 4}} /> {patient.gender}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <Button 
                  icon="phone" 
                  mode="text" 
                  compact 
                  style={styles.contactButton}
                  labelStyle={styles.contactButtonLabel}
                >
                  Call
                </Button>
                <Button 
                  icon="message-text-outline" 
                  mode="text" 
                  compact 
                  style={styles.contactButton}
                  labelStyle={styles.contactButtonLabel}
                >
                  Message
                </Button>
              </View>
            </View>
          </View>
        </Surface>
        
        {/* Vital Stats */}
        <View style={styles.vitalStatsContainer}>
          <Surface style={styles.vitalStat} elevation={1}>
            <TouchableRipple
              rippleColor="rgba(0, 0, 0, 0.1)"
              style={{borderRadius: 12}}
              onPress={() => {}}
            >
              <View style={styles.vitalStatContent}>
                <Text style={styles.vitalValue}>{patient.height}</Text>
                <Text style={styles.vitalLabel}>
                  <FontAwesome5 name="ruler-vertical" size={12} color="#757575" /> Height
                </Text>
              </View>
            </TouchableRipple>
          </Surface>
          
          <Surface style={styles.vitalStat} elevation={1}>
            <TouchableRipple
              rippleColor="rgba(0, 0, 0, 0.1)"
              style={{borderRadius: 12}}
              onPress={() => {}}
            >
              <View style={styles.vitalStatContent}>
                <Text style={styles.vitalValue}>{patient.weight}</Text>
                <Text style={styles.vitalLabel}>
                  <FontAwesome5 name="weight" size={12} color="#757575" /> Weight
                </Text>
              </View>
            </TouchableRipple>
          </Surface>
          
          <Surface style={styles.vitalStat} elevation={1}>
            <TouchableRipple
              rippleColor="rgba(0, 0, 0, 0.1)"
              style={{borderRadius: 12}}
              onPress={() => {}}
            >
              <View style={styles.vitalStatContent}>
                <Text style={styles.vitalValue}>{patient.bloodPressure}</Text>
                <Text style={styles.vitalLabel}>
                  <FontAwesome5 name="heartbeat" size={12} color="#757575" /> BP
                </Text>
              </View>
            </TouchableRipple>
          </Surface>
        </View>
        
        {/* Patient Details */}
        <Surface style={styles.detailsCard} elevation={1}>
          <TouchableRipple
            rippleColor="rgba(0, 0, 0, 0.1)"
            style={{borderRadius: 12}}
            onPress={() => {}}
          >
            <View>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.detailItem}>
                <FontAwesome5 name="phone" size={14} color="#757575" style={styles.detailIcon} />
                <View>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{patient.phone}</Text>
                </View>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome5 name="envelope" size={14} color="#757575" style={styles.detailIcon} />
                <View>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{patient.email}</Text>
                </View>
              </View>
            </View>
          </TouchableRipple>
        </Surface>
        
        {/* Medical History */}
        <Surface style={styles.detailsCard} elevation={1}>
          <TouchableRipple
            rippleColor="rgba(0, 0, 0, 0.1)"
            style={{borderRadius: 12}}
            onPress={() => {}}
          >
            <View>
          <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Medical History</ThemedText>
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.medicalHistoryBox}>
                <ThemedText style={styles.medicalHistoryText}>
                  {patient.medicalHistory || "No medical history recorded"}
            </ThemedText>
              </View>
            </View>
          </TouchableRipple>
        </Surface>
        
        {/* Appointments Section */}
        <Surface style={styles.appointmentsCard} elevation={1}>
          <View style={styles.tabHeader}>
            <ThemedText style={styles.sectionTitle}>Appointments</ThemedText>
            <Button 
              mode="contained" 
              onPress={() => setIsShowingScheduler(true)}
              style={styles.scheduleButton}
              labelStyle={styles.scheduleButtonLabel}
              icon="plus-circle"
              buttonColor="#4CAF50"
            >
              Schedule
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Upcoming Appointments */}
          <View style={styles.appointmentsList}>
            <Text style={styles.appointmentListHeader}>Upcoming</Text>
            
            {sortedAppointments.length > 0 ? (
              sortedAppointments
                .slice(0, 3)
                .map((appointment, index) => (
                  <Surface
                    key={appointment.id}
                    style={[
                      styles.appointmentCard,
                      { backgroundColor: '#FFFFFF' }
                    ]}
                    elevation={1}
                  >
                    <TouchableRipple
                      rippleColor="rgba(0, 0, 0, 0.1)"
                      style={{borderRadius: 12}}
                      onPress={() => router.push(`/appointment/${appointment.id}`)}
                    >
                      <View style={styles.appointmentCardContent}>
                        <View style={[
                          styles.dateCircle, 
                          { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                        ]}>
                          <Text style={[
                            styles.dateDay,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {new Date(appointment.date).getDate()}
                          </Text>
                          <Text style={[
                            styles.dateMonth,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {new Date(appointment.date).toLocaleString('default', { month: 'short' })}
                          </Text>
                        </View>
                        
                        <View style={styles.appointmentInfo}>
                          <View style={styles.appointmentMainInfo}>
                            <Text style={styles.appointmentReason}>{appointment.reason}</Text>
                            <Text style={styles.appointmentTime}>
                              <FontAwesome5 
                                name="clock" 
                                size={12} 
                                color="#757575" 
                                style={{marginRight: 4}}
                              /> {appointment.time}
                            </Text>
                          </View>
                          
                          <View style={[
                            styles.appointmentStatus,
                            { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                            ]}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableRipple>
                  </Surface>
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No upcoming appointments</Text>
              </View>
            )}
          </View>
          
          <Divider style={styles.sectionDivider} />
          
          {/* Past Appointments */}
          <View style={styles.appointmentsList}>
            <Text style={styles.appointmentListHeader}>Past Appointments</Text>
            
            {sortedAppointments.length > 0 ? (
              sortedAppointments
                .slice(0, 3)
                .map((appointment, index) => (
                  <Surface 
                    key={appointment.id} 
                    style={[
                      styles.appointmentCard, 
                      { borderLeftWidth: 4, borderLeftColor: STATUS_COLORS[appointment.status]?.accent || '#2196F3' }
                    ]} 
                    elevation={2}
                  >
                    <View style={styles.appointmentCardContent}>
                      <View style={[
                        styles.dateIndicator,
                        { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                      ]}>
                        <Text style={[
                          styles.dateDay,
                          { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                        ]}>
                          {new Date(appointment.date).getDate()}
                        </Text>
                        <Text style={[
                          styles.dateMonth,
                          { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                        ]}>
                          {new Date(appointment.date).toLocaleString('default', { month: 'short' })}
                        </Text>
                      </View>
                      
                      <View style={styles.appointmentInfo}>
                        <View style={styles.appointmentMainInfo}>
                          <Text style={styles.appointmentReason}>{appointment.reason}</Text>
                          <Text style={styles.appointmentTime}>
                            <FontAwesome5 
                              name="clock" 
                              size={12} 
                              color="#757575" 
                              style={{marginRight: 4}}
                            /> {appointment.time}
                          </Text>
                        </View>
                        
                        <View style={[
                          styles.appointmentStatus,
                          { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {appointment.status === 'completed' && (
                      <>
                        <Divider style={styles.recordDivider} />
                        <View style={styles.medicalRecordSection}>
                          <Text style={styles.medicalRecordSectionTitle}>
                            <FontAwesome5 name="notes-medical" size={12} color={STATUS_COLORS[appointment.status]?.accent || "#2196F3"} style={{marginRight: 6}} />
                            Medical Record
                          </Text>
                          
                          {appointment.notes ? (
                            <View style={styles.recordItemsGrid}>
                              {/* Extract medical record details from notes */}
                              {(() => {
                                // Try to parse medical record from appointment notes
                                const noteLines = appointment.notes.split('\n');
                                const recordItems = [];
                                
                                // Add common items even if not found
                                const recordMap = {
                                  'Complaint': '',
                                  'Diagnosis': '',
                                  'Blood Pressure': '',
                                  'Prescription': ''
                                };
                                
                                // Extract data from notes
                                noteLines.forEach(line => {
                                  Object.keys(recordMap).forEach(key => {
                                    if (line.includes(`${key}:`)) {
                                      recordMap[key] = line.split(`${key}:`)[1]?.trim() || 'Not recorded';
                                    }
                                  });
                                });
                                
                                // Create items for display
                                return Object.entries(recordMap).map(([key, value], idx) => (
                                  <View key={idx} style={styles.recordItem}>
                                    <Text style={styles.recordItemLabel}>{key}</Text>
                                    <Text style={styles.recordItemValue}>{value || 'Not recorded'}</Text>
                                  </View>
                                ));
                              })()}
                            </View>
                          ) : (
                            <Text style={styles.noRecordsText}>No medical record details available</Text>
                          )}
                        </View>
                      </>
                    )}
                  </Surface>
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No appointment history</Text>
              </View>
            )}
            
            {sortedAppointments.length > 3 && (
              <Button 
                mode="text" 
                onPress={() => {
                  // View all history logic would go here
                  showToast('Full history view coming soon', 'info');
                }}
                style={styles.viewAllButton}
              >
                View All History
              </Button>
            )}
          </View>
        </Surface>
      </ScrollView>

      {/* Appointment Scheduler */}
      <AppointmentScheduler
        isVisible={isShowingScheduler}
        onClose={() => setIsShowingScheduler(false)}
        onSchedule={handleScheduleAppointment}
        patientId={patient.id}
        patientName={patient.name}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 0,
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
  profileCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  profileContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarSection: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#757575',
  },
  metaDot: {
    fontSize: 14,
    color: '#BDBDBD',
    marginHorizontal: 8,
  },
  contactRow: {
    flexDirection: 'row',
  },
  contactButton: {
    marginRight: 8,
    paddingHorizontal: 0,
  },
  contactButtonLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  vitalStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  vitalStat: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#757575',
  },
  detailsCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  detailIcon: {
    marginRight: 16,
    width: 20,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#212121',
  },
  medicalHistoryBox: {
    padding: 16,
  },
  medicalHistoryText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  appointmentsCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scheduleButton: {
    borderRadius: 24,
    elevation: 2,
    paddingHorizontal: 8,
  },
  scheduleButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'none',
  },
  appointmentsList: {
    padding: 16,
    paddingTop: 8,
  },
  appointmentListHeader: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#616161',
  },
  appointmentCard: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  appointmentCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  dateCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentMainInfo: {
    flex: 1,
  },
  appointmentReason: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: '#757575',
  },
  appointmentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewRecordsButton: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    padding: 10,
    alignItems: 'center',
  },
  viewRecordsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#9E9E9E',
  },
  scheduleEmptyButton: {
    borderColor: '#4CAF50',
    borderRadius: 20,
  },
  sectionDivider: {
    backgroundColor: '#EEEEEE',
    height: 8,
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recordDivider: {
    backgroundColor: '#EEEEEE',
    height: 1,
  },
  medicalRecordSection: {
    padding: 12,
  },
  medicalRecordSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  recordItemsGrid: {
    flexDirection: 'column',
  },
  recordItem: {
    marginBottom: 8,
  },
  recordItemLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    marginBottom: 2,
  },
  recordItemValue: {
    fontSize: 14,
    color: '#424242',
  },
  noRecordsText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4,
  },
  vitalStatContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  dateIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
});
