import { useState, useEffect } from 'react';
import patientStorageService from './patientStorageService';
import { Patient } from './patientStore';

// Custom hook for accessing patient data from storage
export const usePatientStorage = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        // Get the current patient data
        const currentPatients = await patientStorageService.getPatients();
        setPatients(currentPatients);
        setError(null);
      } catch (err) {
        console.error('Error loading patients:', err);
        setError(err instanceof Error ? err : new Error('Failed to load patients'));
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

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Add a new patient
  const addPatient = async (patientData: Omit<Patient, 'id' | 'visits' | 'lastVisit'>) => {
    try {
      const newPatient = await patientStorageService.addPatient(patientData);
      return newPatient;
    } catch (err) {
      console.error('Error adding patient:', err);
      setError(err instanceof Error ? err : new Error('Failed to add patient'));
      throw err;
    }
  };

  // Update a patient
  const updatePatient = async (id: string, data: Partial<Patient>) => {
    try {
      const updatedPatient = await patientStorageService.updatePatient(id, data);
      return updatedPatient;
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err instanceof Error ? err : new Error('Failed to update patient'));
      throw err;
    }
  };

  // Get a patient by ID
  const getPatientById = async (id: string): Promise<Patient | null> => {
    try {
      return await patientStorageService.getPatientById(id);
    } catch (err) {
      console.error('Error getting patient:', err);
      setError(err instanceof Error ? err : new Error('Failed to get patient'));
      return null;
    }
  };

  return {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    getPatientById
  };
};

export default usePatientStorage; 