import { StyleSheet, ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router } from "expo-router";
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
import { MedicalRecord } from '@/utils/types';

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

export default function PatientDetailsScreen() {
  const { id } = useLocalSearchParams();
  const patientId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const patient = getPatientById(patientId);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);

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
    
    // Close the scheduler
    setSchedulerVisible(false);
  };

  // If patient not found
  if (!patient) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Patient Details" }} />
        <View style={styles.notFoundContainer}>
          <FontAwesome5 name="user-slash" size={48} color="#4CAF50" style={{ marginBottom: 16 }} />
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Patient not found</ThemedText>
          <ThemedText style={{ textAlign: 'center', color: '#666' }}>
            The patient you're looking for doesn't exist or has been removed.
          </ThemedText>
          <Button 
            mode="contained" 
            onPress={() => router.replace("/(tabs)/explore")}
            style={{ marginTop: 24, borderRadius: 8 }}
            buttonColor="#4CAF50"
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
          <ThemedText style={styles.title}>{patient.name}</ThemedText>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/settings`)}>
            <FontAwesome5 name="edit" size={16} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.widgetTitle}>Patient Information</ThemedText>
          </View>
          <Divider style={styles.divider} />
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="user" size={14} color="#4CAF50" style={styles.infoIcon} /> Name:
            </ThemedText>
            <ThemedText>{patient.name}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="birthday-cake" size={14} color="#4CAF50" style={styles.infoIcon} /> Age:
            </ThemedText>
            <ThemedText>{patient.age}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="venus-mars" size={14} color="#4CAF50" style={styles.infoIcon} /> Gender:
            </ThemedText>
            <ThemedText>{patient.gender}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="phone" size={14} color="#4CAF50" style={styles.infoIcon} /> Phone:
            </ThemedText>
            <ThemedText>{patient.phone}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="envelope" size={14} color="#4CAF50" style={styles.infoIcon} /> Email:
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
              <FontAwesome5 name="ruler-vertical" size={14} color="#4CAF50" style={styles.infoIcon} /> Height:
            </ThemedText>
            <ThemedText>{patient.height}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="weight" size={14} color="#4CAF50" style={styles.infoIcon} /> Weight:
            </ThemedText>
            <ThemedText>{patient.weight}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="heartbeat" size={14} color="#4CAF50" style={styles.infoIcon} /> Blood Pressure:
            </ThemedText>
            <ThemedText>{patient.bloodPressure}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>
              <FontAwesome5 name="notes-medical" size={14} color="#4CAF50" style={styles.infoIcon} /> Medical History:
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
                      styles.dateBox, 
                      appointment.status === 'pending' ? styles.pendingDateBox : {}
                    ]}>
                      <ThemedText style={[
                        styles.dateDay,
                        appointment.status === 'pending' ? styles.pendingDateText : {}
                      ]}>
                        {new Date(appointment.date).getDate()}
                      </ThemedText>
                      <ThemedText style={[
                        styles.dateMonth,
                        appointment.status === 'pending' ? styles.pendingDateText : {}
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
                            color={appointment.status === 'pending' ? "#FF9800" : "#4CAF50"} 
                          /> {appointment.time}
                        </ThemedText>
                        <View style={[
                          styles.statusBadge,
                          appointment.status === 'pending' ? styles.pendingBadge : {}
                        ]}>
                          <ThemedText style={[
                            styles.statusText,
                            appointment.status === 'pending' ? styles.pendingStatusText : {}
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
            <ThemedText style={styles.widgetTitle}>Visit History</ThemedText>
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
          
          {/* Past Appointments */}
          <View style={styles.pastAppointmentsContainer}>
            <ThemedText style={styles.sectionSubtitle}>Past Appointments</ThemedText>
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((appointment, index) => (
                <View key={appointment.id}>
                  {index > 0 && <Divider style={styles.appointmentDivider} />}
                  <View style={styles.appointmentItem}>
                    <View style={styles.appointmentRow}>
                      <View style={[
                        styles.dateBox, 
                        appointment.status === 'completed' ? styles.completedDateBox : styles.cancelledDateBox
                      ]}>
                        <ThemedText style={[
                          styles.dateDay,
                          appointment.status === 'completed' ? styles.completedDateText : styles.cancelledDateText
                        ]}>
                          {new Date(appointment.date).getDate()}
                        </ThemedText>
                        <ThemedText style={[
                          styles.dateMonth,
                          appointment.status === 'completed' ? styles.completedDateText : styles.cancelledDateText
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
                              color={appointment.status === 'completed' ? "#4CAF50" : "#F44336"} 
                            /> {appointment.time}
                          </ThemedText>
                          <View style={[
                            styles.statusBadge,
                            appointment.status === 'completed' ? styles.completedBadge : styles.cancelledBadge
                          ]}>
                            <ThemedText style={[
                              styles.statusText,
                              appointment.status === 'completed' ? styles.completedStatusText : styles.cancelledStatusText
                            ]}>{appointment.status}</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={styles.reasonText}>{appointment.reason}</ThemedText>
                        {appointment.notes && (
                          <ThemedText style={styles.notesText}>Notes: {appointment.notes}</ThemedText>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))
            }
            
            {getPatientAppointments(patientId)
              .filter(app => ['completed', 'cancelled'].includes(app.status))
              .length === 0 && (
              <View style={styles.emptyContent}>
                <FontAwesome5 name="history" size={32} color="#CCCCCC" />
                <ThemedText style={styles.emptyText}>No past appointments</ThemedText>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Medical Visit Records */}
          <View style={styles.medicalRecordsContainer}>
            <ThemedText style={styles.sectionSubtitle}>Medical Records</ThemedText>
            
            {patient.visits.length === 0 ? (
              <View style={styles.emptyContent}>
                <FontAwesome5 name="notes-medical" size={32} color="#CCCCCC" />
                <ThemedText style={styles.emptyText}>No visit records</ThemedText>
                <ThemedText style={styles.emptySubText}>
                  Complete an appointment to add visit records
                </ThemedText>
              </View>
            ) : (
              patient.visits.map((visit, index) => {
                // Ensure all fields are available by providing defaults if any field is missing
                const medicalRecord: MedicalRecord = {
                  complaint: visit.complaint || 'Not recorded',
                  diagnosis: visit.diagnosis || 'Not recorded',
                  bloodPressure: visit.bloodPressure || 'Not recorded',
                  weight: visit.weight || 'Not recorded',
                  prescription: visit.prescription || 'Not recorded'
                };
                
                return (
                  <View key={index}>
                    {index > 0 && <Divider style={styles.visitDivider} />}
                    <View style={styles.visitItem}>
                      <View style={styles.visitHeader}>
                        <ThemedText style={styles.visitDate}>
                          <FontAwesome5 name="calendar-day" size={14} color="#4CAF50" /> {formatDate(visit.date)}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.visitInfoRow}>
                        <ThemedText style={styles.visitLabel}>Complaint:</ThemedText>
                        <ThemedText style={styles.visitValue}>{medicalRecord.complaint}</ThemedText>
                      </View>
                      
                      <View style={styles.visitInfoRow}>
                        <ThemedText style={styles.visitLabel}>Diagnosis:</ThemedText>
                        <ThemedText style={styles.visitValue}>{medicalRecord.diagnosis}</ThemedText>
                      </View>
                      
                      <View style={styles.visitInfoRow}>
                        <ThemedText style={styles.visitLabel}>Blood Pressure:</ThemedText>
                        <ThemedText style={styles.visitValue}>{medicalRecord.bloodPressure}</ThemedText>
                      </View>
                      
                      <View style={styles.visitInfoRow}>
                        <ThemedText style={styles.visitLabel}>Weight:</ThemedText>
                        <ThemedText style={styles.visitValue}>{medicalRecord.weight}</ThemedText>
                      </View>
                      
                      <View style={styles.visitInfoRow}>
                        <ThemedText style={styles.visitLabel}>Prescription:</ThemedText>
                        <ThemedText style={styles.visitValue}>{medicalRecord.prescription}</ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })
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
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetSurface: {
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
    paddingBottom: 8,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    backgroundColor: '#E0E0E0',
    height: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  label: {
    width: 120,
    fontWeight: '600',
    color: '#555555',
  },
  infoIcon: {
    marginRight: 8,
  },
  medicalHistoryContainer: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 8,
    width: 48,
    height: 48,
  },
  pendingDateBox: {
    backgroundColor: '#FFF3E0',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pendingDateText: {
    color: '#E65100',
  },
  dateMonth: {
    fontSize: 12,
    color: '#2E7D32',
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
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  pendingStatusText: {
    color: '#E65100',
  },
  reasonText: {
    fontSize: 14,
    marginTop: 4,
  },
  appointmentDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: '#EEEEEE',
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 8,
    color: '#9E9E9E',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubText: {
    color: '#9E9E9E',
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
  medicalRecordsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionSubtitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 12,
    marginTop: 4,
    color: '#2e7d32',
  },
  completedDateBox: {
    backgroundColor: '#E8F5E9',
  },
  completedDateText: {
    color: '#4CAF50',
  },
  cancelledDateBox: {
    backgroundColor: '#FFEBEE',
  },
  cancelledDateText: {
    color: '#F44336',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  completedStatusText: {
    color: '#4CAF50',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
  },
  cancelledStatusText: {
    color: '#F44336',
  },
  notesText: {
    marginTop: 4,
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  visitItem: {
    paddingVertical: 12,
  },
  visitHeader: {
    marginBottom: 12,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  visitInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  visitLabel: {
    width: 120,
    fontWeight: '600',
    color: '#555555',
  },
  visitValue: {
    flex: 1,
    color: '#333333',
  },
  visitDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
