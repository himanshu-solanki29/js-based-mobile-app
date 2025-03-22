import { AppointmentStatus } from './types';

// Initial mock patient data
export const INITIAL_PATIENTS = {
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
    lastVisit: "2023-03-10",
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
    lastVisit: "2023-03-15",
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
  },
  "3": {
    id: "3",
    name: "Robert Johnson",
    age: 58,
    gender: "Male",
    phone: "555-3456",
    email: "robert.johnson@example.com",
    height: "182 cm",
    weight: "88 kg",
    bloodPressure: "135/85",
    medicalHistory: "Type 2 Diabetes, High cholesterol",
    lastVisit: "2023-03-05",
    visits: []
  },
  "4": {
    id: "4",
    name: "Sarah Williams",
    age: 29,
    gender: "Female",
    phone: "555-4567",
    email: "sarah.williams@example.com",
    height: "170 cm",
    weight: "65 kg",
    bloodPressure: "115/70",
    medicalHistory: "None",
    lastVisit: "2023-03-18",
    visits: []
  },
  "5": {
    id: "5",
    name: "Michael Brown",
    age: 47,
    gender: "Male",
    phone: "555-5678",
    email: "michael.brown@example.com",
    height: "178 cm",
    weight: "82 kg",
    bloodPressure: "128/82",
    medicalHistory: "Arthritis",
    lastVisit: "2023-03-12",
    visits: []
  }
};

// Initial mock appointment data with proper typed status
export const INITIAL_APPOINTMENTS = [
  {
    id: '1',
    patientId: '1',
    patientName: 'John Doe',
    date: '2023-06-15',
    time: '09:30 AM',
    reason: 'Follow-up',
    status: 'confirmed' as AppointmentStatus,
  },
  {
    id: '2',
    patientId: '3',
    patientName: 'Robert Johnson',
    date: '2023-06-15',
    time: '11:00 AM',
    reason: 'Annual physical',
    status: 'confirmed' as AppointmentStatus,
  },
  {
    id: '3',
    patientId: '2',
    patientName: 'Jane Smith',
    date: '2023-06-16',
    time: '10:15 AM',
    reason: 'Medication review',
    status: 'pending' as AppointmentStatus,
  },
  {
    id: '4',
    patientId: '5',
    patientName: 'Michael Brown',
    date: '2023-06-16',
    time: '02:45 PM',
    reason: 'New patient consultation',
    status: 'confirmed' as AppointmentStatus,
  },
  {
    id: '5',
    patientId: '4',
    patientName: 'Sarah Williams',
    date: '2023-06-17',
    time: '09:00 AM',
    reason: 'Lab results discussion',
    status: 'confirmed' as AppointmentStatus,
  },
  {
    id: '6',
    patientId: '1',
    patientName: 'John Doe',
    date: '2023-06-14',
    time: '10:00 AM',
    reason: 'Blood test results',
    status: 'completed' as AppointmentStatus,
  },
  {
    id: '7',
    patientId: '3',
    patientName: 'Robert Johnson',
    date: '2023-06-13',
    time: '02:30 PM',
    reason: 'Follow-up consultation',
    status: 'completed' as AppointmentStatus,
  },
]; 