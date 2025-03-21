import { getPatientById, updatePatient } from '@/utils/patientStore';
import { AppointmentStatus } from './types';
import { useState, useEffect } from 'react';

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

// Mock appointment data - shared between components
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

// Track listeners for appointment changes
let listenerCallbacks: (() => void)[] = [];

// Notify all listeners when appointments change
const notifyListeners = () => {
  listenerCallbacks.forEach(callback => callback());
};

// Helper function to get the patient name from the patient store
export const getPatientName = (patientId: string): string => {
  const patient = getPatientById(patientId);
  return patient ? patient.name : 'Unknown Patient';
};

// Add a new appointment to the store
export const addAppointment = (appointmentData: {
  date: Date;
  time: string;
  reason: string;
  notes?: string;
  patientId: string;
  status?: AppointmentStatus;
}): Appointment => {
  // Create a new appointment object
  const newAppointment: Appointment = {
    id: (MOCK_APPOINTMENTS.length + 1).toString(),
    patientId: appointmentData.patientId,
    patientName: getPatientName(appointmentData.patientId),
    date: appointmentData.date.toISOString().split('T')[0],
    time: appointmentData.time,
    reason: appointmentData.reason,
    status: appointmentData.status || 'pending',
    notes: appointmentData.notes
  };

  // Add the appointment to our mock database
  MOCK_APPOINTMENTS.push(newAppointment);
  
  // Notify listeners about the change
  notifyListeners();
  
  return newAppointment;
};

// Helper function to sort appointments chronologically
export const sortAppointmentsByDate = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => {
    // Compare dates first
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // If dates are equal, compare times
    const getTimeValue = (timeStr: string): number => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      let hoursNum = parseInt(hours);
      const minutesNum = parseInt(minutes);
      
      if (modifier === 'PM' && hoursNum < 12) hoursNum += 12;
      if (modifier === 'AM' && hoursNum === 12) hoursNum = 0;
      
      return hoursNum * 60 + minutesNum;
    };
    
    return getTimeValue(a.time) - getTimeValue(b.time);
  });
};

// Helper function to sort appointments by date in descending order (latest first)
export const sortAppointmentsByDateDesc = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => {
    // Compare dates first (descending)
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // If dates are equal, compare times (descending)
    const getTimeValue = (timeStr: string): number => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      let hoursNum = parseInt(hours);
      const minutesNum = parseInt(minutes);
      
      if (modifier === 'PM' && hoursNum < 12) hoursNum += 12;
      if (modifier === 'AM' && hoursNum === 12) hoursNum = 0;
      
      return hoursNum * 60 + minutesNum;
    };
    
    return getTimeValue(b.time) - getTimeValue(a.time);
  });
};

// Function to update appointment status and update patient history when needed
export const updateAppointmentStatus = (
  appointmentId: string, 
  newStatus: AppointmentStatus, 
  remarks?: string
): Appointment | null => {
  // Find the appointment
  const appointmentIndex = MOCK_APPOINTMENTS.findIndex(a => a.id === appointmentId);
  if (appointmentIndex === -1) return null;
  
  const appointment = MOCK_APPOINTMENTS[appointmentIndex];
  const oldStatus = appointment.status;
  
  // Update the appointment status
  appointment.status = newStatus;
  
  // Add remarks if provided
  if (remarks && remarks.trim()) {
    appointment.notes = remarks.trim();
  }
  
  // If the new status is 'completed', update the patient history
  if (newStatus === 'completed' && oldStatus !== 'completed') {
    const patient = getPatientById(appointment.patientId);
    if (patient) {
      // Initialize with default values
      const medicalRecord: MedicalRecord = {
        complaint: appointment.reason,
        diagnosis: 'No diagnosis recorded', // Default value
        bloodPressure: patient.bloodPressure || 'Not measured',
        weight: patient.weight || 'Not measured',
        prescription: 'No prescription recorded'
      };
      
      if (remarks) {
        // Parse medical information from notes
        // Expected format from medical form: "Complaint: <value>\nDiagnosis: <value>\nBlood Pressure: <value>\nWeight: <value>\nPrescription: <value>"
        const complaintMatch = remarks.match(/Complaint:\s*([^\n]+)/);
        const diagnosisMatch = remarks.match(/Diagnosis:\s*([^\n]+)/);
        const bpMatch = remarks.match(/Blood Pressure:\s*([^\n]+)/);
        const weightMatch = remarks.match(/Weight:\s*([^\n]+)/);
        const prescriptionMatch = remarks.match(/Prescription:\s*([^\n]+)/);
        
        if (complaintMatch) medicalRecord.complaint = complaintMatch[1];
        if (diagnosisMatch) medicalRecord.diagnosis = diagnosisMatch[1];
        if (bpMatch) medicalRecord.bloodPressure = bpMatch[1];
        if (weightMatch) medicalRecord.weight = weightMatch[1];
        if (prescriptionMatch) medicalRecord.prescription = prescriptionMatch[1];
      }
      
      // Create a new visit entry
      const newVisit = {
        date: appointment.date,
        ...medicalRecord
      };
      
      // Also update the patient's current vitals if provided
      const patientUpdates: any = {
        visits: [...patient.visits, newVisit],
        lastVisit: appointment.date
      };
      
      // Only update these if they actually have values from the form
      if (medicalRecord.bloodPressure && medicalRecord.bloodPressure !== 'Not measured' && medicalRecord.bloodPressure !== 'Not recorded') {
        patientUpdates.bloodPressure = medicalRecord.bloodPressure;
      }
      
      if (medicalRecord.weight && medicalRecord.weight !== 'Not measured' && medicalRecord.weight !== 'Not recorded') {
        patientUpdates.weight = medicalRecord.weight;
      }
      
      // Update the patient with the new visit and potentially new vitals
      updatePatient(patient.id, patientUpdates);
    }
  }
  
  // Notify listeners about the change
  notifyListeners();
  
  return appointment;
};

// Function to get appointments for a specific patient
export const getPatientAppointments = (patientId: string): Appointment[] => {
  return MOCK_APPOINTMENTS.filter(appointment => appointment.patientId === patientId);
};

// Hook to subscribe to appointment data changes
export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([...MOCK_APPOINTMENTS]);
  
  useEffect(() => {
    const handleChange = () => {
      setAppointments([...MOCK_APPOINTMENTS]);
    };
    
    listenerCallbacks.push(handleChange);
    
    return () => {
      listenerCallbacks = listenerCallbacks.filter(cb => cb !== handleChange);
    };
  }, []);
  
  return {
    appointments,
    upcomingAppointments: sortAppointmentsByDate(
      appointments.filter(a => a.status === 'confirmed' || a.status === 'pending')
    ),
    pastAppointments: sortAppointmentsByDateDesc(
      appointments.filter(a => a.status === 'completed' || a.status === 'cancelled')
    )
  };
}; 