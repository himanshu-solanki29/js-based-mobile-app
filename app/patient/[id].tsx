import { StyleSheet, ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router, useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button, Text, Card, Badge, Surface, Divider, Avatar, ProgressBar, IconButton, TouchableRipple, useTheme, Appbar, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from "react";
import React from 'react';
import { List } from 'react-native-paper';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import usePatientStorage from "@/utils/usePatientStorage";
import useAppointmentStorage from "@/utils/useAppointmentStorage";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { Patient } from '@/utils/patientStore';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import { AppointmentStatus } from '@/utils/types';

// Define the Appointment interface directly in this file
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  medicalRecord?: any;
}

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
type PatientsData = {
  [key: string]: Patient;
};

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
  const theme = useTheme();
  const patientId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const { showToast } = useGlobalToast();
  const { getPatientById } = usePatientStorage();
  const { addAppointment, getPatientAppointments } = useAppointmentStorage();
  const [pastExpanded, setPastExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);

  // Load patient data when the component mounts
  useEffect(() => {
    const loadPatient = async () => {
      try {
        setLoading(true);
        const data = await getPatientById(patientId);
        setPatient(data);
      } catch (error) {
        console.error('Error loading patient:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [patientId, getPatientById]);

  // Load patient appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (!patient) return;
      
      try {
        setAppointmentsLoading(true);
        const appointments = await getPatientAppointments(patientId);
        setPatientAppointments(appointments);
      } catch (error) {
        console.error('Error loading patient appointments:', error);
      } finally {
        setAppointmentsLoading(false);
      }
    };
    
    loadAppointments();
  }, [patient, patientId, getPatientAppointments]);

  const handleScheduleAppointment = async (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => {
    try {
      // Use the appointment storage hook to add the appointment
      const newAppointment = await addAppointment({
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
      
      // Refresh the appointments list
      if (patient) {
        const updatedAppointments = await getPatientAppointments(patientId);
        setPatientAppointments(updatedAppointments);
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      showToast('Failed to schedule appointment', 'error');
    }
  };

  // Show loading state while patient data is being fetched
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Patient Details" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={{marginTop: 16}}>Loading patient data...</Text>
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

  // Group and sort the visits by date (most recent first)
  const sortedVisits = patient.visits 
    ? [...patient.visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
    
  // Prepare upcoming and past appointments
  const upcomingAppointments = patientAppointments.filter(
    apt => apt.status === 'pending' || apt.status === 'confirmed'
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  const pastAppointments = patientAppointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled'
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        <Surface style={styles.profileCard} elevation={1}>
          <View style={styles.profileHeader}>
            <Avatar.Text 
              size={64} 
              label={patient.name.substring(0, 2).toUpperCase()} 
              style={styles.avatar}
              color="#ffffff"
            />
            <View style={styles.profileInfo}>
              <ThemedText style={styles.patientName}>{patient.name}</ThemedText>
              <View style={styles.patientSubInfo}>
                <ThemedText style={styles.patientDetail}>
                  <FontAwesome5 name="calendar-alt" size={12} color="#757575" /> {patient.age} years
                </ThemedText>
                <ThemedText style={styles.patientDetail}>
                  <FontAwesome5 name={patient.gender === 'Male' ? 'mars' : 'venus'} size={12} color="#757575" /> {patient.gender}
                </ThemedText>
              </View>
            </View>
            
            <Button
              mode="contained"
              onPress={() => setSchedulerVisible(true)}
              style={styles.scheduleButton}
              icon={({size, color}) => <FontAwesome5 name="calendar-plus" size={size-2} color={color} />}
              buttonColor="#4CAF50"
            >
              Schedule
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <FontAwesome5 name="phone" size={16} color={theme.colors.primary} style={styles.contactIcon} />
              <ThemedText style={styles.contactText}>{patient.phone}</ThemedText>
            </View>
            {patient.email && (
              <View style={styles.contactRow}>
                <FontAwesome5 name="envelope" size={16} color={theme.colors.primary} style={styles.contactIcon} />
                <ThemedText style={styles.contactText}>{patient.email}</ThemedText>
              </View>
            )}
          </View>
        </Surface>
        
        {/* Medical Information */}
        <Surface style={styles.infoCard} elevation={1}>
          <ThemedText style={styles.sectionTitle}>
            <FontAwesome5 name="notes-medical" size={16} color={theme.colors.primary} style={styles.sectionIcon} /> 
            Medical Information
          </ThemedText>
          
          <View style={styles.medicalInfoGrid}>
            <View style={styles.medicalInfoItem}>
              <ThemedText style={styles.infoLabel}>Height</ThemedText>
              <ThemedText style={styles.infoValue}>{patient.height || 'Not recorded'}</ThemedText>
            </View>
            
            <View style={styles.medicalInfoItem}>
              <ThemedText style={styles.infoLabel}>Weight</ThemedText>
              <ThemedText style={styles.infoValue}>{patient.weight || 'Not recorded'}</ThemedText>
            </View>
            
            <View style={styles.medicalInfoItem}>
              <ThemedText style={styles.infoLabel}>Blood Pressure</ThemedText>
              <ThemedText style={styles.infoValue}>{patient.bloodPressure || 'Not recorded'}</ThemedText>
            </View>
          </View>
          
          {patient.medicalHistory && (
            <View style={styles.historySection}>
              <ThemedText style={styles.historyTitle}>Medical History</ThemedText>
              <ThemedText style={styles.historyText}>{patient.medicalHistory}</ThemedText>
            </View>
          )}
        </Surface>
        
        {/* Upcoming Appointments */}
        <Surface style={styles.infoCard} elevation={1}>
          <ThemedText style={styles.sectionTitle}>
            <FontAwesome5 name="calendar-check" size={16} color={theme.colors.primary} style={styles.sectionIcon} /> 
            Upcoming Appointments
          </ThemedText>
          
          {appointmentsLoading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" />
              <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
            </View>
          ) : upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => {
              const statusColors = STATUS_COLORS[appointment.status] || STATUS_COLORS.confirmed;
              return (
                <TouchableRipple
                  key={appointment.id}
                  onPress={() => router.push(`/appointment/${appointment.id}`)}
                  style={styles.appointmentItem}
                  rippleColor="rgba(0, 0, 0, 0.1)"
                >
                  <View>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.appointmentDate}>
                        <FontAwesome5 name="calendar-day" size={12} color={statusColors.accent} />
                        <ThemedText style={styles.appointmentDateText}>
                          {formatDate(appointment.date)}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.appointmentTime}>
                        <FontAwesome5 name="clock" size={12} color={statusColors.accent} />
                        <ThemedText style={styles.appointmentTimeText}>
                          {appointment.time}
                        </ThemedText>
                      </View>
                      
                      <Badge 
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg }
                        ]}
                      >
                        <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </ThemedText>
                      </Badge>
                    </View>
                    
                    <ThemedText style={styles.appointmentReason}>{appointment.reason}</ThemedText>
                    
                    {appointment.notes && (
                      <ThemedText style={styles.appointmentNotes}>Note: {appointment.notes}</ThemedText>
                    )}
                  </View>
                </TouchableRipple>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="calendar-times" size={24} color="#9E9E9E" style={styles.emptyIcon} />
              <ThemedText style={styles.emptyText}>No upcoming appointments</ThemedText>
              <Button 
                mode="outlined" 
                onPress={() => setSchedulerVisible(true)}
                style={styles.scheduleEmptyButton}
                buttonColor="#f0f0f0"
                textColor="#4CAF50"
                icon={({size, color}) => <FontAwesome5 name="calendar-plus" size={size-2} color={color} />}
              >
                Schedule New
              </Button>
            </View>
          )}
        </Surface>
        
        {/* Past Appointments Section */}
        <Card style={styles.card}>
          <Card.Title 
            title="Past Appointments" 
            subtitle={`${pastAppointments.length} previous visits`}
          />
          <Card.Content>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <FontAwesome5 name="calendar-check" size={24} color="#5CDB95" style={{marginRight: 8}} />
              <ThemedText style={{fontWeight: 'bold'}}>Previous Visits</ThemedText>
            </View>
            {pastAppointments.length > 0 ? (
              pastAppointments.map((appointment) => (
                <TouchableRipple
                  key={appointment.id}
                  onPress={() => router.push(`/appointment/${appointment.id}`)}
                  style={styles.appointmentItem}
                >
                  <View>
                    <View style={styles.appointmentHeader}>
                      <ThemedText style={styles.appointmentDate}>
                        {formatDate(appointment.date)}
                      </ThemedText>
                      <Badge style={{ backgroundColor: '#5CDB95' }}>
                        {appointment.status}
                      </Badge>
                    </View>
                    <ThemedText>{appointment.reason}</ThemedText>
                  </View>
                </TouchableRipple>
              ))
            ) : (
              <ThemedText>Patient hasn't had any previous visits</ThemedText>
            )}
          </Card.Content>
        </Card>
        
        {/* Medical Records Section */}
        <Card style={styles.card}>
          <Card.Title 
            title="Medical Records" 
            subtitle={`${sortedVisits.length} medical records`}
          />
          <Card.Content>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <FontAwesome5 name="file-medical-alt" size={24} color="#5CDB95" style={{marginRight: 8}} />
              <ThemedText style={{fontWeight: 'bold'}}>Health Records</ThemedText>
            </View>
            {sortedVisits.length > 0 ? (
              sortedVisits.map((visit, index) => (
                <Card key={index} style={styles.visitCard}>
                  <Card.Content>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                      <FontAwesome5 name="calendar" size={18} color="#5CDB95" style={{marginRight: 8}} />
                      <ThemedText style={{fontWeight: 'bold'}}>{visit.date} - {visit.diagnosis}</ThemedText>
                    </View>
                    <View style={styles.visitDetail}>
                      <ThemedText style={styles.label}>Chief Complaint:</ThemedText>
                      <ThemedText>{visit.complaint}</ThemedText>
                    </View>
                    <View style={styles.visitDetail}>
                      <ThemedText style={styles.label}>Blood Pressure:</ThemedText>
                      <ThemedText>{visit.bloodPressure}</ThemedText>
                    </View>
                    <View style={styles.visitDetail}>
                      <ThemedText style={styles.label}>Weight:</ThemedText>
                      <ThemedText>{visit.weight}</ThemedText>
                    </View>
                    <View style={styles.visitDetail}>
                      <ThemedText style={styles.label}>Prescription:</ThemedText>
                      <ThemedText>{visit.prescription}</ThemedText>
                    </View>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <ThemedText>No previous medical records found</ThemedText>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Appointment Scheduler */}
      <AppointmentScheduler
        isVisible={isSchedulerVisible}
        onClose={() => setSchedulerVisible(false)}
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
    backgroundColor: '#f8f9fa',
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
    padding: 24,
  },
  appBar: {
    backgroundColor: '#4CAF50',
    elevation: 0,
  },
  appBarTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#4CAF50',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientDetail: {
    marginRight: 16,
    fontSize: 14,
    color: '#666',
  },
  scheduleButton: {
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  contactInfo: {
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionIcon: {
    marginRight: 8,
  },
  medicalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  medicalInfoItem: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  historySection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  appointmentItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentDate: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  appointmentDateText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTimeText: {
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentReason: {
    fontSize: 15,
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  scheduleEmptyButton: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  viewAllButton: {
    marginTop: 8,
  },
  visitCard: {
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitDate: {
    fontWeight: 'bold',
  },
  visitDivider: {
    marginBottom: 12,
  },
  visitDetail: {
    marginBottom: 8,
  },
  visitLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  visitValue: {
    fontSize: 14,
  },
  loadingSection: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  card: {
    marginBottom: 12,
    padding: 0,
    backgroundColor: '#fff',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
