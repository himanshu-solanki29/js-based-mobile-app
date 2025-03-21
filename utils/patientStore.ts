import { useState, useEffect } from 'react';

// Define MedicalRecord interface locally to avoid import issues
interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
}

// Define types for visits and patient data
export type Visit = MedicalRecord & {
  date: string;    // Date from completed appointment
};

export type Patient = {
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
  lastVisit?: string;
};

export type PatientFormData = Omit<Patient, 'id' | 'visits' | 'lastVisit'>;

export type PatientsData = {
  [key: string]: Patient;
};

// Initial mock data
export const INITIAL_PATIENTS: PatientsData = {
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

// In-memory patient store (would be a database in a real app)
let patients = { ...INITIAL_PATIENTS };
let listenerCallbacks: (() => void)[] = [];

// Helper to convert to array format
export const getPatientsArray = (): Patient[] => {
  return Object.values(patients);
};

// Add new patient
export const addPatient = (patientData: PatientFormData): Patient => {
  const id = (Object.keys(patients).length + 1).toString();
  
  const newPatient: Patient = {
    ...patientData,
    id,
    visits: []
  };
  
  patients = {
    ...patients,
    [id]: newPatient
  };
  
  // Notify listeners
  listenerCallbacks.forEach(callback => callback());
  
  return newPatient;
};

// Get patient by ID
export const getPatientById = (id: string): Patient | null => {
  return patients[id] || null;
};

// Update patient
export const updatePatient = (id: string, data: Partial<Patient>): Patient | null => {
  if (!patients[id]) return null;
  
  patients = {
    ...patients,
    [id]: {
      ...patients[id],
      ...data
    }
  };
  
  // Notify listeners
  listenerCallbacks.forEach(callback => callback());
  
  return patients[id];
};

// Function to add a new medical visit record from a completed appointment
export const addMedicalRecord = (
  patientId: string, 
  visitData: {
    date: string;
    diagnosis: string;
    bloodPressure?: string;
    weight?: string;
    prescription?: string;
    complaint?: string;
  }
): Patient | null => {
  const patient = getPatientById(patientId);
  if (!patient) return null;
  
  // Create a new visit record
  const newVisit: Visit = {
    date: visitData.date,
    complaint: visitData.complaint || '',
    diagnosis: visitData.diagnosis,
    bloodPressure: visitData.bloodPressure || patient.bloodPressure || '',
    weight: visitData.weight || patient.weight || '',
    prescription: visitData.prescription || ''
  };
  
  // Update patient with new visit
  const updatedPatient = updatePatient(patientId, {
    visits: [...patient.visits, newVisit],
    lastVisit: visitData.date,
    // Also update current vitals if provided
    ...(visitData.bloodPressure ? { bloodPressure: visitData.bloodPressure } : {}),
    ...(visitData.weight ? { weight: visitData.weight } : {})
  });
  
  return updatedPatient;
};

// Hook to subscribe to patient data changes
export const usePatients = () => {
  const [patientData, setPatientData] = useState<PatientsData>(patients);
  
  useEffect(() => {
    const handleChange = () => {
      setPatientData({ ...patients });
    };
    
    listenerCallbacks.push(handleChange);
    
    return () => {
      listenerCallbacks = listenerCallbacks.filter(cb => cb !== handleChange);
    };
  }, []);
  
  return {
    patients: patientData,
    patientsArray: Object.values(patientData)
  };
}; 