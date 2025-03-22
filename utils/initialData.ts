// This file will be removed, but we'll keep a reference for the types only
import { AppointmentStatus } from './types';

// These are just example data structures for reference
export const EXAMPLE_PATIENT = {
  id: "example",
  name: "Example Patient",
  age: 30,
  gender: "Other",
  phone: "123-456-7890",
  email: "example@email.com",
  height: "175 cm",
  weight: "70 kg",
  bloodPressure: "120/80",
  medicalHistory: "No significant history",
  lastVisit: "",
  visits: []
};

export const EXAMPLE_APPOINTMENT = {
  id: 'example',
  patientId: 'example',
  patientName: 'Example Patient',
  date: '2023-06-15',
  time: '09:30 AM',
  reason: 'Check-up',
  status: 'pending' as AppointmentStatus,
}; 