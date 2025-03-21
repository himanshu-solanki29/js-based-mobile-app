import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, TextInput, Button, Divider } from 'react-native-paper';
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

interface MedicalRecordFormProps {
  initialValues?: Partial<MedicalRecord>;
  onSubmit: (medicalRecord: MedicalRecord) => void;
  submitButtonText?: string;
  disabled?: boolean;
  loading?: boolean;
  hideSubmitButton?: boolean;
}

export function MedicalRecordForm({ 
  initialValues = {}, 
  onSubmit, 
  submitButtonText = 'Submit',
  disabled = false,
  loading = false,
  hideSubmitButton = false
}: MedicalRecordFormProps) {
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord>({
    complaint: initialValues.complaint || '',
    diagnosis: initialValues.diagnosis || '',
    bloodPressure: initialValues.bloodPressure || '',
    weight: initialValues.weight || '',
    prescription: initialValues.prescription || '',
  });
  
  const handleChange = (field: keyof MedicalRecord, value: string) => {
    setMedicalRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = () => {
    onSubmit(medicalRecord);
  };
  
  return (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardHeader}>
        <FontAwesome5 name="notes-medical" size={18} color="#4CAF50" style={styles.cardHeaderIcon} />
        <ThemedText style={styles.cardHeaderTitle}>Medical Record</ThemedText>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.formContainer}>
        <TextInput
          label="Complaint"
          value={medicalRecord.complaint}
          onChangeText={(value) => handleChange('complaint', value)}
          mode="outlined"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor="#4CAF50"
          disabled={disabled}
        />
        
        <TextInput
          label="Diagnosis"
          value={medicalRecord.diagnosis}
          onChangeText={(value) => handleChange('diagnosis', value)}
          mode="outlined"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor="#4CAF50"
          disabled={disabled}
        />
        
        <TextInput
          label="Blood Pressure"
          value={medicalRecord.bloodPressure}
          onChangeText={(value) => handleChange('bloodPressure', value)}
          mode="outlined"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor="#4CAF50"
          disabled={disabled}
        />
        
        <TextInput
          label="Weight"
          value={medicalRecord.weight}
          onChangeText={(value) => handleChange('weight', value)}
          mode="outlined"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor="#4CAF50"
          disabled={disabled}
        />
        
        <TextInput
          label="Prescription"
          value={medicalRecord.prescription}
          onChangeText={(value) => handleChange('prescription', value)}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          outlineColor="#E0E0E0"
          activeOutlineColor="#4CAF50"
          disabled={disabled}
        />
        
        {!hideSubmitButton && (
          <Button 
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            buttonColor="#4CAF50"
            disabled={disabled}
            loading={loading}
          >
            {submitButtonText}
          </Button>
        )}
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
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  }
}); 