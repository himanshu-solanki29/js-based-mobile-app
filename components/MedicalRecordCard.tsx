import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Divider } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { ThemedText } from './ThemedText';

// Define the MedicalRecord interface directly here to avoid any import issues
interface MedicalRecord {
  complaint: string;
  diagnosis: string;
  bloodPressure: string;
  weight: string;
  prescription: string;
}

interface MedicalRecordCardProps {
  notes: string;
}

export function MedicalRecordCard({ notes }: MedicalRecordCardProps) {
  // Parse medical record information from notes string
  const parseNotes = (notes: string): MedicalRecord => {
    const record: MedicalRecord = {
      complaint: 'Not recorded',
      diagnosis: 'Not recorded',
      bloodPressure: 'Not recorded',
      weight: 'Not recorded',
      prescription: 'Not recorded',
    };
    
    const complaintMatch = notes.match(/Complaint:\s*([^\n]+)/);
    const diagnosisMatch = notes.match(/Diagnosis:\s*([^\n]+)/);
    const bpMatch = notes.match(/Blood Pressure:\s*([^\n]+)/);
    const weightMatch = notes.match(/Weight:\s*([^\n]+)/);
    const prescriptionMatch = notes.match(/Prescription:\s*([^\n]+)/);
    
    if (complaintMatch) record.complaint = complaintMatch[1];
    if (diagnosisMatch) record.diagnosis = diagnosisMatch[1];
    if (bpMatch) record.bloodPressure = bpMatch[1];
    if (weightMatch) record.weight = weightMatch[1];
    if (prescriptionMatch) record.prescription = prescriptionMatch[1];
    
    return record;
  };
  
  const medicalRecord = parseNotes(notes);
  
  return (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardHeader}>
        <FontAwesome5 name="file-medical-alt" size={18} color="#4CAF50" style={styles.cardHeaderIcon} />
        <ThemedText style={styles.cardHeaderTitle}>Medical Record</ThemedText>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.recordContainer}>
        <View style={styles.recordRow}>
          <ThemedText style={styles.recordLabel}>Complaint:</ThemedText>
          <ThemedText style={styles.recordValue}>{medicalRecord.complaint}</ThemedText>
        </View>
        
        <View style={styles.recordRow}>
          <ThemedText style={styles.recordLabel}>Diagnosis:</ThemedText>
          <ThemedText style={styles.recordValue}>{medicalRecord.diagnosis}</ThemedText>
        </View>
        
        <View style={styles.recordRow}>
          <ThemedText style={styles.recordLabel}>Blood Pressure:</ThemedText>
          <ThemedText style={styles.recordValue}>{medicalRecord.bloodPressure}</ThemedText>
        </View>
        
        <View style={styles.recordRow}>
          <ThemedText style={styles.recordLabel}>Weight:</ThemedText>
          <ThemedText style={styles.recordValue}>{medicalRecord.weight}</ThemedText>
        </View>
        
        <View style={styles.recordRow}>
          <ThemedText style={styles.recordLabel}>Prescription:</ThemedText>
          <ThemedText style={styles.recordValue}>{medicalRecord.prescription}</ThemedText>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  recordContainer: {
    padding: 16,
  },
  recordRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recordLabel: {
    width: 120,
    fontWeight: '600',
    color: '#555555',
  },
  recordValue: {
    flex: 1,
  },
}); 