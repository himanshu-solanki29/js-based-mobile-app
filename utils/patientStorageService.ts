import StorageService from './storageService';
import type { Patient, PatientFormData } from './patientStore';

// Import only the data, not importing from patientStore to avoid circular dependency
import { INITIAL_PATIENTS } from './initialData';

// Types
export type PatientsData = {
  [key: string]: Patient;
};

type Visit = {
  date: string;
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
};

// Storage keys
const PATIENT_STORAGE_KEY = 'patients_data';

// Class to handle patient data storage
class PatientStorageService extends StorageService<PatientsData> {
  private patients: PatientsData;
  private listeners: (() => void)[] = [];
  private initialized: boolean = false;
  
  constructor() {
    super(PATIENT_STORAGE_KEY);
    this.patients = {};
    this.initialize().catch(err => {
      console.error('Failed to initialize patient storage:', err);
    });
  }
  
  // Initialize the storage with default data if empty
  async initialize() {
    if (this.initialized) return;
    
    try {
      const storedData = await this.getData();
      
      if (storedData) {
        this.patients = storedData;
      } else {
        // Use initial data for first-time setup
        this.patients = INITIAL_PATIENTS;
        await this.saveData(this.patients);
      }
      
      this.initialized = true;
      // Notify listeners of initialization
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing patient storage:', error);
      // Still mark as initialized to prevent further initialization attempts
      this.initialized = true;
      // Use default data if there was an error
      this.patients = INITIAL_PATIENTS;
    }
  }
  
  // Ensure storage is initialized before accessing data
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  // Save patients to storage
  private async persistPatients() {
    await this.ensureInitialized();
    try {
      await this.saveData(this.patients);
      this.notifyListeners();
    } catch (error) {
      console.error('Error persisting patients:', error);
    }
  }
  
  // Get all patients as an array
  async getPatients(): Promise<Patient[]> {
    await this.ensureInitialized();
    return Object.values(this.patients);
  }
  
  // Get a specific patient by ID
  async getPatientById(id: string): Promise<Patient | null> {
    await this.ensureInitialized();
    return this.patients[id] || null;
  }
  
  // Add a new patient
  async addPatient(patientData: PatientFormData): Promise<Patient> {
    await this.ensureInitialized();
    
    const id = (Object.keys(this.patients).length + 1).toString();
    
    const newPatient: Patient = {
      ...patientData,
      id,
      visits: []
    };
    
    this.patients = {
      ...this.patients,
      [id]: newPatient
    };
    
    await this.persistPatients();
    return newPatient;
  }
  
  // Update an existing patient
  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient | null> {
    await this.ensureInitialized();
    
    if (!this.patients[id]) return null;
    
    this.patients = {
      ...this.patients,
      [id]: {
        ...this.patients[id],
        ...data
      }
    };
    
    await this.persistPatients();
    return this.patients[id];
  }
  
  // Add a medical record to a patient's history
  async addMedicalRecord(
    patientId: string, 
    visitData: {
      date: string;
      diagnosis: string;
      bloodPressure?: string;
      weight?: string;
      prescription?: string;
      complaint?: string;
    }
  ): Promise<Patient | null> {
    await this.ensureInitialized();
    
    const patient = this.patients[patientId];
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
    return this.updatePatient(patientId, {
      visits: [...patient.visits, newVisit],
      lastVisit: visitData.date,
      // Also update current vitals if provided
      ...(visitData.bloodPressure ? { bloodPressure: visitData.bloodPressure } : {}),
      ...(visitData.weight ? { weight: visitData.weight } : {})
    });
  }
  
  // Subscribe to changes in patient data
  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  // Notify all listeners of changes
  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }
}

// Create a singleton instance
const patientStorageService = new PatientStorageService();
export default patientStorageService; 