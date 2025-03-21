import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  Text, 
  Button, 
  Card, 
  Title, 
  Surface,
  Paragraph, 
  ActivityIndicator, 
  Divider, 
  Badge, 
  Portal, 
  Dialog, 
  TextInput,
  IconButton
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import LottieView from 'lottie-react-native';

export default function AppointmentDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useGlobalToast();
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    // This would normally load appointment data
    // For now, we'll just simulate loading completion
    setTimeout(() => {
      setLoading(false);
      setAppointment({
        id: '123',
        status: 'confirmed',
        reason: 'Annual checkup',
        date: new Date().toISOString(),
        time: '10:00 AM'
      });
      setPatient({
        id: '456',
        firstName: 'John',
        lastName: 'Doe',
        age: 35,
        gender: 'Male',
        phone: '555-123-4567'
      });
    }, 1000);
  }, []);

  const completeAppointment = () => {
    setShowSuccessAnimation(true);
    setTimeout(() => {
      setShowSuccessAnimation(false);
      showToast('Appointment completed successfully');
      setAppointment({
        ...appointment,
        status: 'completed'
      });
    }, 2000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView>
        <Surface style={styles.surface}>
          <View style={styles.header}>
            <Title>Appointment Details</Title>
            <Button 
              icon="arrow-left"
              onPress={() => router.back()}>
              Back
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>
              {patient.firstName} {patient.lastName}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Status:</Text>
            <Badge style={
              appointment.status === 'completed' ? styles.completedBadge : 
              appointment.status === 'confirmed' ? styles.confirmedBadge : 
              styles.scheduledBadge
            }>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Reason:</Text>
            <Text style={styles.value}>{appointment.reason}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          {appointment.status === 'confirmed' && (
            <Button 
              mode="contained"
              onPress={completeAppointment}
              style={styles.completeButton}>
              Complete Appointment
            </Button>
          )}
        </Surface>
      </ScrollView>

      {/* Success Animation Portal */}
      {showSuccessAnimation && (
        <Portal>
          <View style={styles.animationContainer}>
            <View style={styles.animationContent}>
              <LottieView
                source={require('@/assets/animations/success.json')}
                autoPlay
                loop={false}
                style={styles.animation}
              />
            </View>
          </View>
        </Portal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  value: {
    flex: 1,
  },
  scheduledBadge: {
    backgroundColor: '#FFB74D',
  },
  confirmedBadge: {
    backgroundColor: '#4CAF50',
  },
  completedBadge: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  animationContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  animationContent: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: 160,
    height: 160,
  },
});