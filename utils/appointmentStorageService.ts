import StorageService from './storageService';
import type { Appointment, AppointmentStatus } from './appointmentStore';
import patientStorageService from './patientStorageService';

// Import only the data, not importing from appointmentStore to avoid circular dependency
import { INITIAL_APPOINTMENTS } from './initialData';

// Storage keys
const APPOINTMENT_STORAGE_KEY = 'appointments_data';

// Class to handle appointment data storage
class AppointmentStorageService extends StorageService<Appointment[]> {
  private appointments: Appointment[];
  private listeners: (() => void)[] = [];
  private initialized: boolean = false;
  
  constructor() {
    super(APPOINTMENT_STORAGE_KEY);
    this.appointments = [];
    this.initialize().catch(err => {
      console.error('Failed to initialize appointment storage:', err);
    });
  }
  
  // Initialize the storage with default data if empty
  async initialize() {
    if (this.initialized) return;
    
    try {
      const storedData = await this.getData();
      
      if (storedData && storedData.length > 0) {
        this.appointments = storedData;
      } else {
        // Use initial data for first-time setup
        this.appointments = INITIAL_APPOINTMENTS;
        await this.saveData(this.appointments);
      }
      
      this.initialized = true;
      // Notify listeners of initialization
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing appointment storage:', error);
      // Still mark as initialized to prevent further initialization attempts
      this.initialized = true;
      // Use default data if there was an error
      this.appointments = INITIAL_APPOINTMENTS;
    }
  }
  
  // Ensure storage is initialized before accessing data
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  // Save appointments to AsyncStorage
  private async persistAppointments() {
    await this.ensureInitialized();
    try {
      await this.saveData(this.appointments);
      this.notifyListeners();
    } catch (error) {
      console.error('Error persisting appointments:', error);
    }
  }
  
  // Get all appointments
  async getAppointments(): Promise<Appointment[]> {
    await this.ensureInitialized();
    return [...this.appointments];
  }
  
  // Get a specific appointment by ID
  async getAppointmentById(id: string): Promise<Appointment | null> {
    await this.ensureInitialized();
    const appointment = this.appointments.find(a => a.id === id);
    return appointment || null;
  }
  
  // Get patient appointments
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    await this.ensureInitialized();
    return this.appointments.filter(a => a.patientId === patientId);
  }
  
  // Helper function to get patient name
  private async getPatientName(patientId: string): Promise<string> {
    const patient = await patientStorageService.getPatientById(patientId);
    return patient ? patient.name : 'Unknown Patient';
  }
  
  // Add a new appointment
  async addAppointment(appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes?: string;
    patientId: string;
    status?: AppointmentStatus;
  }): Promise<Appointment> {
    await this.ensureInitialized();
    
    // Create a new appointment object
    const newAppointment: Appointment = {
      id: (this.appointments.length + 1).toString(),
      patientId: appointmentData.patientId,
      patientName: await this.getPatientName(appointmentData.patientId),
      date: appointmentData.date.toISOString().split('T')[0],
      time: appointmentData.time,
      reason: appointmentData.reason,
      status: appointmentData.status || 'pending',
      notes: appointmentData.notes
    };
    
    // Add the appointment to our array
    this.appointments.push(newAppointment);
    
    // Persist to storage
    await this.persistAppointments();
    
    return newAppointment;
  }
  
  // Sort appointments by date (ascending)
  sortAppointmentsByDate(appointments = this.appointments): Appointment[] {
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
  }
  
  // Sort appointments by date (descending)
  sortAppointmentsByDateDesc(appointments = this.appointments): Appointment[] {
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
  }
  
  // Update appointment status
  async updateAppointmentStatus(
    appointmentId: string, 
    newStatus: AppointmentStatus, 
    remarks?: string
  ): Promise<Appointment | null> {
    await this.ensureInitialized();
    
    // Find the appointment
    const appointmentIndex = this.appointments.findIndex(a => a.id === appointmentId);
    if (appointmentIndex === -1) return null;
    
    const appointment = this.appointments[appointmentIndex];
    const oldStatus = appointment.status;
    
    // Update the appointment status
    appointment.status = newStatus;
    
    // Add remarks if provided
    if (remarks && remarks.trim()) {
      appointment.notes = remarks.trim();
    }
    
    // If the new status is 'completed', update the patient history
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      const patient = await patientStorageService.getPatientById(appointment.patientId);
      if (patient) {
        // Initialize with default values
        const medicalRecord = {
          complaint: appointment.reason,
          diagnosis: 'No diagnosis recorded', // Default value
          bloodPressure: patient.bloodPressure || 'Not measured',
          weight: patient.weight || 'Not measured',
          prescription: 'No prescription recorded'
        };
        
        if (remarks) {
          // Parse medical information from notes
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
        
        // Update patient record
        await patientStorageService.addMedicalRecord(appointment.patientId, {
          date: appointment.date,
          diagnosis: medicalRecord.diagnosis,
          bloodPressure: medicalRecord.bloodPressure,
          weight: medicalRecord.weight,
          prescription: medicalRecord.prescription,
          complaint: medicalRecord.complaint
        });
      }
    }
    
    // Save changes
    await this.persistAppointments();
    
    return appointment;
  }
  
  // Subscribe to changes in appointment data
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
const appointmentStorageService = new AppointmentStorageService();
export default appointmentStorageService; 