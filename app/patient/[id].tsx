import { StyleSheet, ScrollView, TouchableOpacity, View, Alert, Platform, Linking } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Chip, Divider, IconButton, List, Text, Appbar, Surface, Avatar, TouchableRipple } from "react-native-paper";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { formatDate } from "@/utils/dateFormat";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { useGlobalToast } from "@/components/GlobalToastProvider";
import { requestStoragePermissions, checkStoragePermissions } from '@/app/runtime-permissions';
import usePatientStorage from '@/utils/usePatientStorage';
import { 
  getPatientById, 
  updatePatient, 
  Patient
} from "@/utils/patientStore";
import { 
  getPatientAppointments,
  addAppointment, 
  Appointment,
  AppointmentStatus
} from '@/utils/appointmentStore';
import { globalEventEmitter } from '@/app/(tabs)/index';

// Define types for visits and patient data
type Visit = {
  date: string;    // Date from completed appointment
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
};

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

export default function PatientDetailsScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const { showToast } = useGlobalToast();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingScheduler, setIsShowingScheduler] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSchedulingAppointment, setIsSchedulingAppointment] = useState(false);

  // Listen for data changes
  useEffect(() => {
    // Define the refresh handler
    const handleDataChange = () => {
      console.log('PatientDetailsScreen: Refreshing after data change');
      // Force a refresh
      setRefreshTrigger(prev => prev + 1);
    };
    
    // Add event listener
    globalEventEmitter.addListener('DATA_CHANGED', handleDataChange);
    
    // Remove event listener on cleanup
    return () => {
      globalEventEmitter.removeListener('DATA_CHANGED', handleDataChange);
    };
  }, []);
  
  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      try {
        setIsLoading(true);
        console.log('Loading patient with ID:', id);
        
        // Get the patient
        const patientData = await getPatientById(id);
        if (!patientData) {
          console.error('Patient not found:', id);
          showToast('Patient not found', 'error');
          router.back();
          return;
        }
        
        setPatient(patientData);
        
        // Get patient appointments
        const appointments = await getPatientAppointments(id);
        setPatientAppointments(appointments);
        
      } catch (error) {
        console.error('Error loading patient:', error);
        showToast('Error loading patient data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPatient();
  }, [id, refreshTrigger]); // Add refreshTrigger as a dependency
  
  // Filter upcoming appointments
  const upcomingAppointments = React.useMemo(() => {
    return patientAppointments
      .filter(app => ['confirmed', 'pending'].includes(app.status))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [patientAppointments]);
  
  // Filter past appointments
  const pastAppointments = React.useMemo(() => {
    return patientAppointments
      .filter(app => ['completed', 'cancelled'].includes(app.status))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientAppointments]);

  const handleScheduleAppointment = async (appointmentData) => {
    try {
      setIsSchedulingAppointment(true);

      // On Android, check for storage permissions
      if (Platform.OS === 'android') {
        const hasPermissions = await checkStoragePermissions();
        if (!hasPermissions) {
          const granted = await requestStoragePermissions();
          if (!granted) {
            Alert.alert(
              "Permission Required", 
              "Storage permission is needed to save appointment data.",
              [{ text: "OK" }]
            );
            return;
          }
        }
      }

      // Add appointment
      await addAppointment({
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason,
        notes: appointmentData.notes,
        patientId: patient?.id || '',
        status: 'pending'
      });

      // Update list of appointments
      const updatedAppointments = await getPatientAppointments(id);
      setPatientAppointments(updatedAppointments);
      
      // Show success toast
      showToast('Appointment scheduled successfully', 'success');
      
      // Hide scheduler
      setIsShowingScheduler(false);
      
      // Notify other components that data has changed
      globalEventEmitter.emit('DATA_CHANGED');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      showToast('Failed to schedule appointment', 'error');
    } finally {
      setIsSchedulingAppointment(false);
    }
  };

  // Add these functions to handle communication actions
  const handlePhoneCall = () => {
    if (patient?.phone) {
      const phoneUrl = `tel:${patient.phone.replace(/\D/g, '')}`;
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            showToast('Phone calls not supported on this device', 'error');
          }
        })
        .catch(err => {
          console.error('Error opening phone app:', err);
          showToast('Could not open phone app', 'error');
        });
    }
  };

  const handleSendSMS = () => {
    if (patient?.phone) {
      const smsUrl = `sms:${patient.phone.replace(/\D/g, '')}`;
      Linking.canOpenURL(smsUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(smsUrl);
          } else {
            showToast('SMS not supported on this device', 'error');
          }
        })
        .catch(err => {
          console.error('Error opening messaging app:', err);
          showToast('Could not open messaging app', 'error');
        });
    }
  };

  const handleSendEmail = () => {
    if (patient?.email) {
      const emailUrl = `mailto:${patient.email}?subject=Regarding your appointment`;
      Linking.canOpenURL(emailUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(emailUrl);
          } else {
            showToast('Email not supported on this device', 'error');
          }
        })
        .catch(err => {
          console.error('Error opening email app:', err);
          showToast('Could not open email app', 'error');
        });
    }
  };

  // If loading
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Patient Details" }} />
        <View style={styles.loadingContainer}>
          <Text>Loading patient data...</Text>
        </View>
      </ThemedView>
    );
  }

  // If patient not found
  if (!patient) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Patient Details" }} />
        <View style={styles.notFoundContainer}>
          <FontAwesome5 name="user-slash" size={48} color="#9E9E9E" style={{ marginBottom: 16 }} />
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Patient not found</ThemedText>
          <ThemedText style={{ textAlign: 'center', color: '#666' }}>
            The patient you're looking for doesn't exist or has been removed.
          </ThemedText>
          <Button 
            mode="contained" 
            onPress={() => router.replace("/(tabs)/explore")}
            style={{ marginTop: 24, borderRadius: 8 }}
            buttonColor="#757575"
            textColor="#ffffff"
          >
            Back to Patients List
          </Button>
        </View>
      </ThemedView>
    );
  }

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
            </View>
          </View>
        </Surface>
        
        {/* Contact Information Card */}
        <Surface style={styles.detailsCard} elevation={1}>
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.detailItem}>
              <FontAwesome5 name="phone" size={14} color="#757575" style={styles.detailIcon} />
              <View style={styles.contactDetail}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{patient.phone}</Text>
              </View>
              <View style={styles.buttonsContainer}>
                <Button 
                  icon="phone" 
                  mode="contained" 
                  compact 
                  style={[styles.roundButton, {backgroundColor: '#4CAF50'}]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.roundButtonLabel}
                  onPress={handlePhoneCall}
                >{''}</Button>
                <Button 
                  icon="message-text-outline" 
                  mode="contained" 
                  compact 
                  style={[styles.roundButton, {backgroundColor: '#FF9800'}]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.roundButtonLabel}
                  onPress={handleSendSMS}
                >{''}</Button>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <FontAwesome5 name="envelope" size={14} color="#757575" style={styles.detailIcon} />
              <View style={styles.contactDetail}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{patient.email}</Text>
              </View>
              <Button 
                icon="email-outline" 
                mode="contained" 
                compact 
                style={[styles.roundButton, {backgroundColor: '#2196F3'}]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.roundButtonLabel}
                onPress={handleSendEmail}
              >{''}</Button>
            </View>
          </View>
        </Surface>
        
        {/* Health Information Card */}
        <Surface style={styles.detailsCard} elevation={1}>
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Health Information</ThemedText>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.vitalStatsContainer}>
              <View style={styles.vitalItem}>
                <FontAwesome5 name="ruler-vertical" size={14} color="#757575" style={styles.vitalIcon} />
                <View>
                  <Text style={styles.vitalLabel}>Height</Text>
                  <Text style={styles.vitalValue}>{patient.height || 'Not recorded'}</Text>
                </View>
              </View>
              
              <View style={styles.vitalItem}>
                <FontAwesome5 name="weight" size={14} color="#757575" style={styles.vitalIcon} />
                <View>
                  <Text style={styles.vitalLabel}>Weight</Text>
                  <Text style={styles.vitalValue}>{patient.weight || 'Not recorded'}</Text>
                </View>
              </View>
              
              <View style={styles.vitalItem}>
                <FontAwesome5 name="heartbeat" size={14} color="#757575" style={styles.vitalIcon} />
                <View>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalValue}>{patient.bloodPressure || 'Not recorded'}</Text>
                </View>
              </View>
            </View>
            
            <Divider style={styles.sectionDivider} />
            
            <View style={styles.medicalHistorySection}>
              <Text style={styles.medicalHistoryLabel}>Medical History</Text>
              <Text style={styles.medicalHistoryText}>
                {patient.medicalHistory || "No medical history recorded"}
              </Text>
            </View>
          </View>
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
            
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments
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
            
            {pastAppointments.length > 0 ? (
              pastAppointments
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
            
            {pastAppointments.length > 3 && (
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
  vitalStatsContainer: {
    padding: 16,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vitalIcon: {
    marginRight: 16,
    width: 20,
    textAlign: 'center',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 15,
    color: '#212121',
  },
  contactDetail: {
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundButton: {
    marginHorizontal: 4,
    borderRadius: 24,
    minWidth: 44,
    height: 44,
    elevation: 2,
  },
  buttonContent: {
    height: 44,
    width: 44,
  },
  roundButtonLabel: {
    marginLeft: 0,
    marginRight: 0,
    fontSize: 16,
    color: '#FFFFFF',
  },
  sectionDivider: {
    backgroundColor: '#EEEEEE',
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  medicalHistorySection: {
    padding: 16,
  },
  medicalHistoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 8,
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
});
