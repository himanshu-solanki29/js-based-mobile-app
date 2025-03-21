import { StyleSheet, ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router, useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button, Text, Card, Badge, Surface, Divider, Avatar, ProgressBar, IconButton, TouchableRipple, useTheme, Appbar } from 'react-native-paper';
import { useState, useEffect } from "react";
import React from 'react';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { getPatientById } from "@/utils/patientStore";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { 
  getPatientAppointments,
  addAppointment, 
  Appointment
} from '@/utils/appointmentStore';
import { useGlobalToast } from '@/components/GlobalToastProvider';

// Mock appointment data used across the app
// In a real app this would be in a central store/context
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
  // More appointments would be here
];

// Define types for visits and patient data
type Visit = {
  date: string;    // Date from completed appointment
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
};

// Note: In a production app, visits would be generated from completed appointments

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  height: string;
  weight: string;
  bloodPressure: string;
  medicalHistory: string;
  visits: Visit[];
};

type PatientsData = {
  [key: string]: Patient;
};

// Mock data for patient visits and details
const MOCK_PATIENTS: PatientsData = {
  "1": {
    id: "1",
    name: "John Doe",
    age: 42,
    gender: "Male",
    phone: "555-1234",
    email: "john.doe@example.com",
    height: "175 cm",
    weight: "78 kg",
    bloodPressure: "120/80",
    medicalHistory: "Hypertension, Seasonal allergies",
    visits: [
      {
        date: "2023-03-10",
        complaint: "Persistent cough",
        diagnosis: "Bronchitis",
        bloodPressure: "126/82",
        weight: "78 kg",
        prescription: "Amoxicillin 500mg, twice daily for 7 days"
      },
      {
        date: "2023-02-15",
        complaint: "Headache, fatigue",
        diagnosis: "Migraine",
        bloodPressure: "130/85",
        weight: "79 kg",
        prescription: "Sumatriptan 50mg as needed, Propranolol 40mg daily"
      }
    ]
  },
  "2": {
    id: "2",
    name: "Jane Smith",
    age: 35,
    gender: "Female",
    phone: "555-2345",
    email: "jane.smith@example.com",
    height: "165 cm",
    weight: "62 kg",
    bloodPressure: "118/75",
    medicalHistory: "Asthma",
    visits: [
      {
        date: "2023-03-15",
        complaint: "Shortness of breath",
        diagnosis: "Asthma exacerbation",
        bloodPressure: "120/78",
        weight: "62 kg",
        prescription: "Albuterol inhaler, Prednisone 40mg daily for 5 days"
      }
    ]
  }
};

// Add MedicalRecord interface definition directly in the file
// Define the MedicalRecord interface locally
interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
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

export default function PatientDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const patientId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const patient = getPatientById(patientId);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const { showToast } = useGlobalToast();

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
    showToast(`Appointment scheduled for ${formatDate(newAppointment.date)} at ${newAppointment.time}`, 'success');
    
    // Close the scheduler
    setSchedulerVisible(false);
  };

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
              onPress={() => setSchedulerVisible(true)}
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
            
            {getPatientAppointments(patientId)
              .filter(app => ['confirmed', 'pending'].includes(app.status))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
                          styles.statusChip,
                          { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                        ]}>
                          <Text style={[
                            styles.statusChipText,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {appointment.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
              ))
            }
            
            {getPatientAppointments(patientId)
              .filter(app => ['confirmed', 'pending'].includes(app.status))
              .length === 0 && (
              <View style={styles.emptyState}>
                <FontAwesome5 name="calendar-times" size={24} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>No upcoming appointments</Text>
                <Button 
                  mode="outlined" 
                  onPress={() => setSchedulerVisible(true)}
                  style={styles.scheduleEmptyButton}
                  textColor="#4CAF50"
                >
                  Schedule Now
                </Button>
              </View>
            )}
          </View>
          
          <Divider style={styles.sectionDivider} />
          
          {/* Past Appointments */}
          <View style={styles.appointmentsList}>
            <Text style={styles.appointmentListHeader}>Past Appointments</Text>
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
                        styles.statusChip,
                        { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                      ]}>
                        <Text style={[
                          styles.statusChipText,
                          { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                        ]}>
                          {appointment.status}
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
            }
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .length === 0 && (
              <View style={styles.emptyState}>
                <FontAwesome5 name="history" size={24} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>No appointment history</Text>
              </View>
            )}
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .length > 3 && (
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
        isVisible={isSchedulerVisible}
        onClose={() => setSchedulerVisible(false)}
        onSchedule={handleScheduleAppointment}
        patientId={patientId}
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
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
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
  emptyStateText: {
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
});
