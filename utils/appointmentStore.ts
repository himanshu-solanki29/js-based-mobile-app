import { getPatientById } from '@/utils/patientStore';
import { AppointmentStatus } from './types';
import { useState, useEffect } from 'react';
import appointmentStorageService from './appointmentStorageService';

// Re-export the AppointmentStatus type
export { AppointmentStatus };

// Define MedicalRecord interface locally to avoid import issues
interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
}

// Define appointment types
export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string; // Optional notes property
  medicalRecord?: MedicalRecord; // Optional medical record for completed appointments
};

// Mock appointment data - kept for reference and initialization
export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'John Doe',
    date: '2023-06-15',
    time: '09:30 AM',
    reason: 'Follow-up',
    status: 'confirmed',
  },
  {
    id: '2',
    patientId: '3',
    patientName: 'Robert Johnson',
    date: '2023-06-15',
    time: '11:00 AM',
    reason: 'Annual physical',
    status: 'confirmed',
  },
  {
    id: '3',
    patientId: '2',
    patientName: 'Jane Smith',
    date: '2023-06-16',
    time: '10:15 AM',
    reason: 'Medication review',
    status: 'pending',
  },
  {
    id: '4',
    patientId: '5',
    patientName: 'Michael Brown',
    date: '2023-06-16',
    time: '02:45 PM',
    reason: 'New patient consultation',
    status: 'confirmed',
  },
  {
    id: '5',
    patientId: '4',
    patientName: 'Sarah Williams',
    date: '2023-06-17',
    time: '09:00 AM',
    reason: 'Lab results discussion',
    status: 'confirmed',
  },
  {
    id: '6',
    patientId: '1',
    patientName: 'John Doe',
    date: '2023-06-14',
    time: '10:00 AM',
    reason: 'Blood test results',
    status: 'completed',
  },
  {
    id: '7',
    patientId: '3',
    patientName: 'Robert Johnson',
    date: '2023-06-13',
    time: '02:30 PM',
    reason: 'Follow-up consultation',
    status: 'completed',
  },
];

// Helper function to get the patient name from the patient store
export const getPatientName = (patientId: string): string => {
  const patient = getPatientById(patientId);
  return patient ? patient.name : 'Unknown Patient';
};

// Add a new appointment to the store
export const addAppointment = async (appointmentData: {
  date: Date;
  time: string;
  reason: string;
  notes?: string;
  patientId: string;
  status?: AppointmentStatus;
}): Promise<Appointment> => {
  return await appointmentStorageService.addAppointment(appointmentData);
};

// Helper function to sort appointments chronologically
export const sortAppointmentsByDate = (appointments: Appointment[]): Appointment[] => {
  return appointmentStorageService.sortAppointmentsByDate(appointments);
};

// Helper function to sort appointments by date in descending order (latest first)
export const sortAppointmentsByDateDesc = (appointments: Appointment[]): Appointment[] => {
  return appointmentStorageService.sortAppointmentsByDateDesc(appointments);
};

// Function to update appointment status and update patient history when needed
export const updateAppointmentStatus = async (
  appointmentId: string, 
  newStatus: AppointmentStatus, 
  remarks?: string
): Promise<Appointment | null> => {
  return await appointmentStorageService.updateAppointmentStatus(appointmentId, newStatus, remarks);
};

// Get appointments for a specific patient
export const getPatientAppointments = (patientId: string): Appointment[] => {
  return appointmentStorageService.getPatientAppointments(patientId);
};

// Hook to subscribe to appointment data changes
export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  useEffect(() => {
    const handleChange = () => {
      setAppointments(appointmentStorageService.getAppointments());
    };
    
    // Initial load
    handleChange();
    
    // Subscribe to changes
    const unsubscribe = appointmentStorageService.subscribe(handleChange);
    
    return () => unsubscribe();
  }, []);
  
  return {
    appointments,
    sortedAppointments: sortAppointmentsByDate(appointments),
    sortedAppointmentsDesc: sortAppointmentsByDateDesc(appointments)
  };
}; 