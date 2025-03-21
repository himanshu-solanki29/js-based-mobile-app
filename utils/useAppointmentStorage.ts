import { useState, useEffect } from 'react';
import appointmentStorageService from './appointmentStorageService';
import { Appointment, AppointmentStatus } from './appointmentStore';

// Custom hook for accessing appointment data from storage
export const useAppointmentStorage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        // Get the current appointment data
        const currentAppointments = appointmentStorageService.getAppointments();
        setAppointments(currentAppointments);
        setError(null);
      } catch (err) {
        console.error('Error loading appointments:', err);
        setError(err instanceof Error ? err : new Error('Failed to load appointments'));
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadAppointments();

    // Subscribe to changes
    const unsubscribe = appointmentStorageService.subscribe(() => {
      const updatedAppointments = appointmentStorageService.getAppointments();
      setAppointments(updatedAppointments);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Add a new appointment
  const addAppointment = async (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes?: string;
    patientId: string;
    status?: AppointmentStatus;
  }) => {
    try {
      const newAppointment = await appointmentStorageService.addAppointment(appointmentData);
      return newAppointment;
    } catch (err) {
      console.error('Error adding appointment:', err);
      setError(err instanceof Error ? err : new Error('Failed to add appointment'));
      throw err;
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatus,
    remarks?: string
  ) => {
    try {
      const updatedAppointment = await appointmentStorageService.updateAppointmentStatus(
        appointmentId,
        newStatus,
        remarks
      );
      return updatedAppointment;
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(err instanceof Error ? err : new Error('Failed to update appointment status'));
      throw err;
    }
  };

  // Get an appointment by ID
  const getAppointmentById = (id: string): Appointment | null => {
    return appointmentStorageService.getAppointmentById(id);
  };

  // Get appointments for a patient
  const getPatientAppointments = (patientId: string): Appointment[] => {
    return appointmentStorageService.getPatientAppointments(patientId);
  };

  // Get sorted appointments
  const getSortedAppointments = (ascending: boolean = true): Appointment[] => {
    return ascending
      ? appointmentStorageService.sortAppointmentsByDate(appointments)
      : appointmentStorageService.sortAppointmentsByDateDesc(appointments);
  };

  // Filter appointments by status
  const getAppointmentsByStatus = (status: AppointmentStatus | 'all'): Appointment[] => {
    if (status === 'all') {
      return [...appointments];
    }
    return appointments.filter(appointment => appointment.status === status);
  };

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointmentStatus,
    getAppointmentById,
    getPatientAppointments,
    getSortedAppointments,
    getAppointmentsByStatus
  };
};

export default useAppointmentStorage; 