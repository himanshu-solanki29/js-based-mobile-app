import StorageService from './storageService';
import { Appointment, MOCK_APPOINTMENTS, AppointmentStatus } from './appointmentStore';
import patientStorageService from './patientStorageService';

// Storage keys
const APPOINTMENT_STORAGE_KEY = 'appointments_data';

// Class to handle appointment data storage
class AppointmentStorageService extends StorageService<Appointment[]> {
  private appointments: Appointment[];
  private listeners: (() => void)[] = [];
  
  constructor() {
    super(APPOINTMENT_STORAGE_KEY);
    this.appointments = [];
    this.initialize();
  }
  
  // Initialize the storage with default data if empty
  private async initialize() {
    const storedData = await this.getData();
    
    if (storedData && storedData.length > 0) {
      this.appointments = storedData;
    } else {
      // Use initial data for first-time setup
      this.appointments = MOCK_APPOINTMENTS;
      await this.saveData(this.appointments);
    }
    
    // Notify listeners of initialization
    this.notifyListeners();
  }
  
  // Save appointments to AsyncStorage
  private async persistAppointments() {
    await this.saveData(this.appointments);
    this.notifyListeners();
  }
  
  // Get all appointments
  getAppointments(): Appointment[] {
    return [...this.appointments];
  }
  
  // Get a specific appointment by ID
  getAppointmentById(id: string): Appointment | null {
    const appointment = this.appointments.find(a => a.id === id);
    return appointment || null;
  }
  
  // Get patient appointments
  getPatientAppointments(patientId: string): Appointment[] {
    return this.appointments.filter(a => a.patientId === patientId);
  }
  
  // Helper function to get patient name
  private getPatientName(patientId: string): string {
    const patient = patientStorageService.getPatientById(patientId);
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
    // Create a new appointment object
    const newAppointment: Appointment = {
      id: (this.appointments.length + 1).toString(),
      patientId: appointmentData.patientId,
      patientName: this.getPatientName(appointmentData.patientId),
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
      const patient = patientStorageService.getPatientById(appointment.patientId);
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