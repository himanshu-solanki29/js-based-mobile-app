import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DatePicker from 'react-native-modern-datepicker';
import { format } from 'date-fns';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import patientStorageService from '@/utils/patientStorageService';
import { requestStoragePermissions, checkStoragePermissions } from '../runtime-permissions';

export default function AddPatientForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();
  const { showToast } = useGlobalToast();

  const validateForm = () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!birthDate) newErrors.birthDate = 'Birth date is required';
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid';
    }
    if (phone && !/^[0-9+\s()-]{10,15}$/.test(phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateChange = (selectedDate) => {
    setBirthDate(selectedDate);
    setDatePickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check for Android permissions
      if (Platform.OS === 'android') {
        const hasPermissions = await checkStoragePermissions();
        if (!hasPermissions) {
          const granted = await requestStoragePermissions();
          if (!granted) {
            Alert.alert(
              "Permission Required", 
              "Storage permission is needed to save patient data.",
              [{ text: "OK" }]
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Create a new patient object
      const newPatient = {
        id: Date.now().toString(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate,
        phone: phone.trim(),
        email: email.trim(),
        medicalHistory: medicalHistory.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save the patient using the storage service
      const savedPatient = await patientStorageService.addPatient(newPatient);

      if (savedPatient) {
        // Show success message
        showToast('Patient created successfully', 'success');
        // Navigate back
        navigation.goBack();
      } else {
        throw new Error('Failed to save patient');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      showToast(`Error: ${error.message || 'Failed to create patient'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.formContainer}>
        <TextInput
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          mode="outlined"
          style={styles.input}
          error={!!errors.firstName}
        />
        {errors.firstName && <HelperText type="error">{errors.firstName}</HelperText>}

        <TextInput
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          mode="outlined"
          style={styles.input}
          error={!!errors.lastName}
        />
        {errors.lastName && <HelperText type="error">{errors.lastName}</HelperText>}

        <TextInput
          label="Birth Date *"
          value={birthDate ? format(new Date(birthDate), 'MM/dd/yyyy') : ''}
          mode="outlined"
          style={styles.input}
          error={!!errors.birthDate}
          right={<TextInput.Icon icon="calendar" onPress={() => setDatePickerVisible(true)} />}
          editable={false}
          onPressIn={() => setDatePickerVisible(true)}
        />
        {errors.birthDate && <HelperText type="error">{errors.birthDate}</HelperText>}

        {datePickerVisible && (
          <View style={styles.datePickerContainer}>
            <DatePicker
              onSelectedChange={handleDateChange}
              mode="calendar"
              maximumDate={new Date().toISOString().split('T')[0]}
            />
            <Button onPress={() => setDatePickerVisible(false)}>Close</Button>
          </View>
        )}

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          error={!!errors.phone}
        />
        {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
        />
        {errors.email && <HelperText type="error">{errors.email}</HelperText>}

        <TextInput
          label="Medical History"
          value={medicalHistory}
          onChangeText={setMedicalHistory}
          mode="outlined"
          style={styles.textArea}
          multiline
          numberOfLines={5}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={styles.button}
        >
          Save Patient
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    padding: 16,
    elevation: 4,
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  textArea: {
    marginBottom: 16,
    height: 100,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
}); 