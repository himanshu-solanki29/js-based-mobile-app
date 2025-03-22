import { useState, useEffect } from 'react';
import patientStorageService from './patientStorageService';

// Define types for visits and patient data
export interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
}

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

// Export patient-related operations that interact with storage service
export const getPatientsArray = async (): Promise<Patient[]> => {
  return patientStorageService.getPatients();
};

// Add new patient
export const addPatient = async (patientData: PatientFormData): Promise<Patient> => {
  return await patientStorageService.addPatient(patientData);
};

// Get patient by ID
export const getPatientById = async (id: string): Promise<Patient | null> => {
  return await patientStorageService.getPatientById(id);
};

// Update patient
export const updatePatient = async (id: string, data: Partial<Patient>): Promise<Patient | null> => {
  return await patientStorageService.updatePatient(id, data);
};

// Function to add a new medical visit record from a completed appointment
export const addMedicalRecord = async (
  patientId: string, 
  visitData: {
    date: string;
    diagnosis: string;
    bloodPressure?: string;
    weight?: string;
    prescription?: string;
    complaint?: string;
  }
): Promise<Patient | null> => {
  return await patientStorageService.addMedicalRecord(patientId, visitData);
};

// Hook to subscribe to patient data changes
export const usePatients = () => {
  const [patientData, setPatientData] = useState<PatientsData>({});
  const [patientsArray, setPatientsArray] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const patients = await patientStorageService.getPatients();
        
        // Convert array to object format for backward compatibility
        const patientsObj = patients.reduce((acc, patient) => {
          acc[patient.id] = patient;
          return acc;
        }, {} as PatientsData);
        
        setPatientData(patientsObj);
        setPatientsArray(patients);
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial load
    loadPatients();
    
    // Subscribe to changes
    const unsubscribe = patientStorageService.subscribe(() => {
      loadPatients();
    });
    
    return () => unsubscribe();
  }, []);
  
  return {
    patients: patientData,
    patientsArray,
    loading
  };
}; 