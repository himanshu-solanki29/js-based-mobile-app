import StorageService from './storageService';
import type { Patient, PatientFormData } from './patientStore';

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
  public initialized: boolean = false;
  
  constructor() {
    super(PATIENT_STORAGE_KEY);
    this.patients = {};
    this.listeners = [];
    
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
        // Initialize with empty data, not dummy data
        this.patients = {};
        await this.saveData(this.patients);
      }
      
      this.initialized = true;
      // Notify listeners of initialization
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing patient storage:', error);
      // Still mark as initialized to prevent further initialization attempts
      this.initialized = true;
      // Use empty data if there was an error
      this.patients = {};
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
    
    // Create a unique ID for the new patient
    const patientId = (Object.keys(this.patients).length + 1).toString();
    
    // Create a new patient object
    const newPatient: Patient = {
      id: patientId,
      name: patientData.name,
      age: parseInt(patientData.age.toString()),
      gender: patientData.gender,
      phone: patientData.phone,
      email: patientData.email || '',
      height: patientData.height || '',
      weight: patientData.weight || '',
      bloodPressure: patientData.bloodPressure || '',
      medicalHistory: patientData.medicalHistory || '',
      visits: [],
      lastVisit: ''
    };
    
    // Add the patient to our database
    this.patients[patientId] = newPatient;
    
    // Persist to storage
    await this.persistPatients();
    
    return newPatient;
  }
  
  // Add multiple patients at once (for import functionality)
  async bulkAddPatients(newPatients: Record<string, Patient>): Promise<void> {
    await this.ensureInitialized();
    
    // Check for overwriting patients - log it but still allow it
    const existingIds = Object.keys(this.patients);
    const newIds = Object.keys(newPatients);
    const overlappingIds = newIds.filter(id => existingIds.includes(id));
    
    if (overlappingIds.length > 0) {
      console.log(`Overwriting ${overlappingIds.length} existing patients:`, overlappingIds);
    }
    
    // Merge new patients with existing patients
    this.patients = {
      ...this.patients,
      ...newPatients
    };
    
    // Persist to storage
    await this.persistPatients();
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
  
  // Reset patient storage to empty
  async reset(): Promise<void> {
    try {
      console.log('Resetting patient storage to initial state');
      // Reset to empty object
      this.patients = {};
      // Save to storage
      await this.saveData(this.patients);
      // Notify listeners
      this.notifyListeners();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error resetting patient storage:', error);
      return Promise.reject(error);
    }
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
  
  // Delete a patient by ID
  async deletePatient(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    // Check if patient exists
    if (!this.patients[id]) {
      return false;
    }
    
    // Create a new patients object without the specified patient
    const updatedPatients = { ...this.patients };
    delete updatedPatients[id];
    
    // Update the patients object
    this.patients = updatedPatients;
    
    // Persist to storage
    await this.persistPatients();
    
    return true;
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