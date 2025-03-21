import StorageService from './storageService';
import { Patient, PatientsData, PatientFormData, INITIAL_PATIENTS } from './patientStore';

// Storage keys
const PATIENT_STORAGE_KEY = 'patients_data';

// Class to handle patient data storage
class PatientStorageService extends StorageService<PatientsData> {
  private patients: PatientsData;
  private listeners: (() => void)[] = [];
  
  constructor() {
    super(PATIENT_STORAGE_KEY);
    this.patients = {};
    this.initialize();
  }
  
  // Initialize the storage with default data if empty
  private async initialize() {
    const storedData = await this.getData();
    
    if (storedData) {
      this.patients = storedData;
    } else {
      // Use initial data for first-time setup
      this.patients = INITIAL_PATIENTS;
      await this.saveData(this.patients);
    }
    
    // Notify listeners of initialization
    this.notifyListeners();
  }
  
  // Save patients to AsyncStorage
  private async persistPatients() {
    await this.saveData(this.patients);
    this.notifyListeners();
  }
  
  // Get all patients as an array
  getPatients(): Patient[] {
    return Object.values(this.patients);
  }
  
  // Get a specific patient by ID
  getPatientById(id: string): Patient | null {
    return this.patients[id] || null;
  }
  
  // Add a new patient
  async addPatient(patientData: PatientFormData): Promise<Patient> {
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
    const patient = this.getPatientById(patientId);
    if (!patient) return null;
    
    // Create a new visit record
    const newVisit = {
      date: visitData.date,
      complaint: visitData.complaint || '',
      diagnosis: visitData.diagnosis,
      bloodPressure: visitData.bloodPressure || patient.bloodPressure || '',
      weight: visitData.weight || patient.weight || '',
      prescription: visitData.prescription || ''
    };
    
    // Update patient with new visit
    const updatedPatient = await this.updatePatient(patientId, {
      visits: [...patient.visits, newVisit],
      lastVisit: visitData.date,
      // Also update current vitals if provided
      ...(visitData.bloodPressure ? { bloodPressure: visitData.bloodPressure } : {}),
      ...(visitData.weight ? { weight: visitData.weight } : {})
    });
    
    return updatedPatient;
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