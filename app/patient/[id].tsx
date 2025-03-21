import { StyleSheet, ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router, useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button, Text, Card, Badge, Surface, Divider, Avatar, ProgressBar, IconButton } from 'react-native-paper';
import { useState, useEffect } from "react";

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
      <Stack.Screen options={{ title: patient.name }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton 
            icon="arrow-left" 
            size={24} 
            onPress={() => router.back()} 
            style={styles.backButton} 
          />
          <Text style={styles.headerTitle}>{patient.name || 'Patient Details'}</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.widgetTitle}>Patient Information</ThemedText>
          </View>
          <Divider style={styles.divider} />
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="user" size={14} color="#757575" style={styles.infoIcon} /> Name:
            </ThemedText>
            <ThemedText>{patient.name}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="birthday-cake" size={14} color="#757575" style={styles.infoIcon} /> Age:
            </ThemedText>
            <ThemedText>{patient.age}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="venus-mars" size={14} color="#757575" style={styles.infoIcon} /> Gender:
            </ThemedText>
            <ThemedText>{patient.gender}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="phone" size={14} color="#757575" style={styles.infoIcon} /> Phone:
            </ThemedText>
            <ThemedText>{patient.phone}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="envelope" size={14} color="#757575" style={styles.infoIcon} /> Email:
            </ThemedText>
            <ThemedText>{patient.email}</ThemedText>
          </ThemedView>
        </Surface>

        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.widgetTitle}>Health Information</ThemedText>
          </View>
          <Divider style={styles.divider} />
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="ruler-vertical" size={14} color="#757575" style={styles.infoIcon} /> Height:
            </ThemedText>
            <ThemedText>{patient.height}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="weight" size={14} color="#757575" style={styles.infoIcon} /> Weight:
            </ThemedText>
            <ThemedText>{patient.weight}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="heartbeat" size={14} color="#757575" style={styles.infoIcon} /> Blood Pressure:
            </ThemedText>
            <ThemedText>{patient.bloodPressure}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="notes-medical" size={14} color="#757575" style={styles.infoIcon} /> Medical History:
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.medicalHistoryContainer}>
            <ThemedText>{patient.medicalHistory || "No medical history recorded"}</ThemedText>
          </ThemedView>
        </Surface>

        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.widgetHeader}>
            <ThemedText style={styles.widgetTitle}>Upcoming Appointments</ThemedText>
            <Button 
              mode="text" 
              onPress={() => setSchedulerVisible(true)}
              labelStyle={styles.scheduleButtonText}
              icon={() => <FontAwesome5 name="plus" size={16} color="#4CAF50" />}
              compact
            >
              Schedule
            </Button>
          </View>
          
          {getPatientAppointments(patientId)
            .filter(app => ['confirmed', 'pending'].includes(app.status))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3)
            .map((appointment, index) => (
              <View key={appointment.id}>
                {index > 0 && <Divider style={styles.appointmentDivider} />}
                <View style={styles.appointmentItem}>
                  <View style={styles.appointmentRow}>
                    <View style={[
                      styles.appointmentDateBox,
                      { 
                        backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg,
                        borderWidth: 1,
                        borderColor: '#E0E0E0',
                        shadowColor: "#000",
                        shadowOffset: {width: 0, height: 1},
                        shadowOpacity: 0.1,
                        shadowRadius: 1,
                        elevation: 1
                      }
                    ]}>
                      <ThemedText style={[
                        styles.appointmentDay,
                        { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                      ]}>
                        {new Date(appointment.date).getDate()}
                      </ThemedText>
                      <ThemedText style={[
                        styles.appointmentMonth,
                        { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                      ]}>
                        {new Date(appointment.date).toLocaleString('default', { month: 'short' })}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.appointmentDetails}>
                      <View style={styles.appointmentHeader}>
                        <ThemedText style={styles.appointmentTime}>
                          <FontAwesome5 
                            name="clock" 
                            size={12} 
                            color={STATUS_COLORS[appointment.status]?.accent || 
                              (appointment.status === 'confirmed' || appointment.status === 'pending' 
                                ? STATUS_COLORS.confirmed.accent 
                                : STATUS_COLORS.completed.accent)} 
                            style={{marginRight: 4}}
                          /> {appointment.time}
                </ThemedText>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                        ]}>
                          <ThemedText style={[
                            styles.statusText,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>{appointment.status}</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.reasonText}>{appointment.reason}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ))
          }
          
          {getPatientAppointments(patientId)
            .filter(app => ['confirmed', 'pending'].includes(app.status))
            .length === 0 && (
            <View style={styles.emptyContent}>
              <FontAwesome5 name="calendar-times" size={32} color="#CCCCCC" />
              <ThemedText style={styles.emptyText}>No upcoming appointments</ThemedText>
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
        </Surface>

        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.widgetHeader}>
            <ThemedText style={styles.widgetTitle}>Medical History</ThemedText>
          </View>
          
          {/* Past Appointments */}
          <View style={styles.pastAppointmentsContainer}>
            <Divider style={styles.divider} />
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((appointment, index) => {
                // Extract medical record info from notes if it's a completed appointment
                let medicalRecord = null;
                if (appointment.status === 'completed' && appointment.notes) {
                  // Try to parse medical record from appointment notes
                  const noteLines = appointment.notes.split('\n');
                  const recordData: Partial<MedicalRecord> = {};
                  
                  noteLines.forEach(line => {
                    if (line.includes('Complaint:')) recordData.complaint = line.split('Complaint:')[1]?.trim();
                    if (line.includes('Diagnosis:')) recordData.diagnosis = line.split('Diagnosis:')[1]?.trim();
                    if (line.includes('Blood Pressure:')) recordData.bloodPressure = line.split('Blood Pressure:')[1]?.trim();
                    if (line.includes('Weight:')) recordData.weight = line.split('Weight:')[1]?.trim();
                    if (line.includes('Prescription:')) recordData.prescription = line.split('Prescription:')[1]?.trim();
                  });
                  
                  // Only set medical record if we found some data
                  if (Object.keys(recordData).length > 0) {
                    medicalRecord = {
                      complaint: recordData.complaint || 'Not recorded',
                      diagnosis: recordData.diagnosis || 'Not recorded',
                      bloodPressure: recordData.bloodPressure || 'Not recorded',
                      weight: recordData.weight || 'Not recorded',
                      prescription: recordData.prescription || 'Not recorded'
                    };
                  }
                }
                
                return (
                  <Surface key={appointment.id} style={styles.appointmentCard} elevation={1}>
                    <View style={styles.appointmentCardHeader}>
                      <View style={styles.appointmentHeaderLeft}>
                        <View style={[
                          styles.appointmentDateBox, 
                          { 
                            backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg,
                            borderWidth: 1,
                            borderColor: '#E0E0E0',
                            shadowColor: "#000",
                            shadowOffset: {width: 0, height: 1},
                            shadowOpacity: 0.1,
                            shadowRadius: 1,
                            elevation: 1
                          }
                        ]}>
                          <ThemedText style={[
                            styles.appointmentDay,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {new Date(appointment.date).getDate()}
                          </ThemedText>
                          <ThemedText style={[
                            styles.appointmentMonth,
                            { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                          ]}>
                            {new Date(appointment.date).toLocaleString('default', { month: 'short' })}
                          </ThemedText>
                        </View>
                        
                        <View style={styles.appointmentHeaderContent}>
                          <ThemedText style={styles.appointmentTime}>
                            <FontAwesome5 
                              name="clock" 
                              size={12} 
                              color={STATUS_COLORS[appointment.status]?.accent || STATUS_COLORS.completed.accent} 
                              style={{marginRight: 4}}
                            /> {appointment.time}
                          </ThemedText>
                          <ThemedText style={styles.reasonText}>{appointment.reason}</ThemedText>
                        </View>
                      </View>
                      
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[appointment.status]?.bg || STATUS_COLORS.completed.bg }
                      ]}>
                        <ThemedText style={[
                          styles.statusText,
                          { color: STATUS_COLORS[appointment.status]?.text || STATUS_COLORS.completed.text }
                        ]}>{appointment.status}</ThemedText>
                      </View>
                    </View>
                    
                    {/* Show simplified notes if no medical record data was extracted */}
                    {appointment.notes && !medicalRecord && (
                      <View style={styles.notesContainer}>
                        <Divider style={styles.notesDivider} />
                        <ThemedText style={styles.notesText}>Notes: {appointment.notes}</ThemedText>
                      </View>
                    )}
                    
                    {/* Show medical record data if available */}
                    {medicalRecord && (
                      <View style={styles.medicalRecordContainer}>
                        <Divider style={styles.medicalRecordDivider} />
                        <ThemedText style={styles.medicalRecordTitle}>
                          <FontAwesome5 
                            name="notes-medical" 
                            size={14} 
                            color={STATUS_COLORS[appointment.status]?.accent || STATUS_COLORS.completed.accent} 
                            style={{marginRight: 6}} 
                          /> 
                          Medical Record
                        </ThemedText>
                        
                        <View style={styles.medicalRecordGrid}>
                          {Object.entries(medicalRecord).map(([key, value], idx) => (
                            <View key={key} style={styles.medicalRecordItem}>
                              <ThemedText style={styles.medicalRecordLabel}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                              </ThemedText>
                              <ThemedText style={styles.medicalRecordValue}>{value as string}</ThemedText>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </Surface>
                );
              })
            }
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .length === 0 && (
              <View style={styles.emptyContent}>
                <FontAwesome5 name="history" size={32} color="#CCCCCC" />
                <ThemedText style={styles.emptyText}>No medical history records</ThemedText>
                <ThemedText style={styles.emptySubText}>Complete an appointment to add medical records</ThemedText>
              </View>
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
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  backButton: {
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
  },
  widgetSurface: {
    marginHorizontal: 0,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: '#E0E0E0',
    height: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    width: 130,
    fontWeight: '500',
  },
  infoIcon: {
    marginRight: 8,
    color: '#757575',
  },
  medicalHistoryContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  scheduleButtonText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  appointmentItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appointmentDateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 8,
    width: 48,
    height: 48,
  },
  appointmentDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appointmentMonth: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  reasonText: {
    fontSize: 14,
    marginTop: 4,
  },
  appointmentDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#9E9E9E',
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 14,
  },
  scheduleEmptyButton: {
    borderColor: '#4CAF50',
    borderRadius: 8,
    marginTop: 8,
  },
  pastAppointmentsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionSubtitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 12,
    color: '#424242',
  },
  appointmentCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentCardHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  appointmentHeaderContent: {
    marginLeft: 12,
    flex: 1,
  },
  notesContainer: {
    padding: 16,
    paddingTop: 0,
  },
  notesDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  medicalRecordContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  medicalRecordDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  medicalRecordTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    paddingLeft: 16,
    backgroundColor: '#FFFFFF',
  },
  medicalRecordGrid: {
    padding: 16,
    paddingTop: 12,
  },
  medicalRecordItem: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  medicalRecordLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
    width: 110,
  },
  medicalRecordValue: {
    fontSize: 13,
    flex: 1,
    color: '#333333',
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#757575',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
