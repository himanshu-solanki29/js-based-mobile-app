import { useState, useEffect, useMemo } from 'react';
import appointmentStorageService from './appointmentStorageService';
import { Appointment } from './appointmentStore';

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
        const currentAppointments = await appointmentStorageService.getAppointments();
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
      loadAppointments();
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Add a new appointment
  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    try {
      const newAppointment = await appointmentStorageService.addAppointment(appointmentData);
      return newAppointment;
    } catch (err) {
      console.error('Error adding appointment:', err);
      setError(err instanceof Error ? err : new Error('Failed to add appointment'));
      throw err;
    }
  };

  // Update an appointment status
  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      const updatedAppointment = await appointmentStorageService.updateAppointmentStatus(id, status);
      return updatedAppointment;
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(err instanceof Error ? err : new Error('Failed to update appointment status'));
      throw err;
    }
  };

  // Get an appointment by ID
  const getAppointmentById = async (id: string): Promise<Appointment | null> => {
    try {
      return await appointmentStorageService.getAppointmentById(id);
    } catch (err) {
      console.error('Error getting appointment:', err);
      setError(err instanceof Error ? err : new Error('Failed to get appointment'));
      return null;
    }
  };

  // Get appointments for a patient
  const getPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
    try {
      return await appointmentStorageService.getPatientAppointments(patientId);
    } catch (err) {
      console.error('Error getting patient appointments:', err);
      setError(err instanceof Error ? err : new Error('Failed to get patient appointments'));
      return [];
    }
  };

  // Derived appointment lists
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter(appointment => {
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      return appointmentDate >= now && appointment.status !== 'cancelled';
    });
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter(appointment => {
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      return appointmentDate < now || appointment.status === 'cancelled';
    });
  }, [appointments]);

  return {
    appointments,
    upcomingAppointments,
    pastAppointments,
    loading,
    error,
    addAppointment,
    updateAppointmentStatus,
    getAppointmentById,
    getPatientAppointments
  };
};

export default useAppointmentStorage; 