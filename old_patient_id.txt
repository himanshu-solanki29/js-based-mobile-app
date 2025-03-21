import { StyleSheet, ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { Colors } from "@/constants/Colors";
import { Stack, useLocalSearchParams, router, useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button, Text, Card, Badge, Surface, Divider, Avatar, ProgressBar, IconButton, TouchableRipple, useTheme, Appbar, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from "react";
import React from 'react';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import usePatientStorage from "@/utils/usePatientStorage";
import useAppointmentStorage from "@/utils/useAppointmentStorage";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { Patient } from '@/utils/patientStore';
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
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const { showToast } = useGlobalToast();
  const { getPatientById } = usePatientStorage();
  const { addAppointment } = useAppointmentStorage();

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
          
          <View style={styles.contactSection}>
            <View style={styles.contactItem}>
              <FontAwesome5 name="phone" size={16} color="#4CAF50" solid />
              <Text style={styles.contactText}>{patient.phone}</Text>
            </View>
            <View style={styles.contactItem}>
              <FontAwesome5 name="envelope" size={16} color="#4CAF50" solid />
              <Text style={styles.contactText}>{patient.email}</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              onPress={() => setSchedulerVisible(true)}
              style={styles.scheduleButton}
              labelStyle={styles.buttonLabel}
              buttonColor="#4CAF50"
            >
              Schedule Appointment
            </Button>
          </View>
        </Surface>
        
        {/* Medical Details Section */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.vitalsRow}>
            <Card style={styles.vitalCard}>
              <Card.Content>
                <Text style={styles.vitalLabel}>Blood Pressure</Text>
                <Text style={styles.vitalValue}>{patient.bloodPressure || "N/A"}</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.vitalCard}>
              <Card.Content>
                <Text style={styles.vitalLabel}>Weight</Text>
                <Text style={styles.vitalValue}>{patient.weight || "N/A"}</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.vitalCard}>
              <Card.Content>
                <Text style={styles.vitalLabel}>Height</Text>
                <Text style={styles.vitalValue}>{patient.height || "N/A"}</Text>
              </Card.Content>
            </Card>
          </View>
          
          <View style={styles.medHistoryContainer}>
            <Text style={styles.medHistoryLabel}>Medical History</Text>
            <Text style={styles.medHistoryText}>
              {patient.medicalHistory || "No medical history recorded"}
            </Text>
          </View>
        </Surface>
        
        {/* Previous Visits Section */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Previous Visits</Text>
          <Divider style={styles.divider} />
          
          {patient.visits && patient.visits.length > 0 ? (
            patient.visits.map((visit, index) => (
              <Card key={index} style={styles.visitCard}>
                <Card.Content>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
                    <Badge style={styles.diagnosisBadge}>{visit.diagnosis}</Badge>
                  </View>
                  
                  <Divider style={{marginVertical: 8}} />
                  
                  <View style={styles.visitDetails}>
                    <View style={styles.visitDetailRow}>
                      <Text style={styles.visitDetailLabel}>Complaint:</Text>
                      <Text style={styles.visitDetailValue}>{visit.complaint}</Text>
                    </View>
                    
                    <View style={styles.visitDetailRow}>
                      <Text style={styles.visitDetailLabel}>Blood Pressure:</Text>
                      <Text style={styles.visitDetailValue}>{visit.bloodPressure}</Text>
                    </View>
                    
                    <View style={styles.visitDetailRow}>
                      <Text style={styles.visitDetailLabel}>Weight:</Text>
                      <Text style={styles.visitDetailValue}>{visit.weight}</Text>
                    </View>
                    
                    <View style={styles.visitDetailRow}>
                      <Text style={styles.visitDetailLabel}>Prescription:</Text>
                      <Text style={styles.visitDetailValue}>{visit.prescription}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.noVisitsContainer}>
              <FontAwesome5 name="calendar-times" size={32} color="#9E9E9E" style={{ marginBottom: 8 }} />
              <Text style={styles.noVisitsText}>No previous visits recorded</Text>
            </View>
          )}
        </Surface>
      </ScrollView>
      
      {/* Appointment Scheduler Modal */}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  appBar: {
    backgroundColor: '#4CAF50',
    elevation: 0,
  },
  appBarTitle: {
    color: 'white',
    fontWeight: 'normal',
  },
  profileCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileContent: {
    flexDirection: 'row',
    padding: 16,
  },
  avatarSection: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#757575',
  },
  metaDot: {
    marginHorizontal: 8,
    color: '#BDBDBD',
  },
  contactSection: {
    padding: 16,
    paddingTop: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
  },
  actionButtons: {
    padding: 16,
    paddingTop: 0,
  },
  scheduleButton: {
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    paddingVertical: 2,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vitalCard: {
    width: '30%',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  medHistoryContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  medHistoryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  medHistoryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  visitCard: {
    marginBottom: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitDate: {
    fontWeight: 'bold',
  },
  diagnosisBadge: {
    backgroundColor: '#E3F2FD',
    color: '#0D47A1',
  },
  visitDetails: {
    marginTop: 4,
  },
  visitDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  visitDetailLabel: {
    width: 110,
    fontWeight: 'bold',
    fontSize: 13,
  },
  visitDetailValue: {
    flex: 1,
    fontSize: 13,
  },
  noVisitsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noVisitsText: {
    color: '#757575',
    fontSize: 16,
  },
});
