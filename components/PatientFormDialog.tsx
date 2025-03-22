import { StyleSheet, ScrollView, View } from "react-native";
import { useState } from "react";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { 
  TextInput, 
  Button, 
  Divider, 
  useTheme
} from 'react-native-paper';
import { ThemedText } from "@/components/ThemedText";
import { addPatient, PatientFormData } from "@/utils/patientStore";
import { Portal, Modal } from 'react-native-paper';
import { globalEventEmitter } from '@/app/(tabs)/index';

interface PatientFormDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (patientId: string) => void;
}

export default function PatientFormDialog({ visible, onDismiss, onSuccess }: PatientFormDialogProps) {
  const theme = useTheme();
  const primaryColor = theme.colors.primary;
  
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    age: 0,
    gender: "male",
    phone: "",
    email: "",
    height: "",
    weight: "",
    bloodPressure: "",
    medicalHistory: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof PatientFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: field === 'age' ? (parseInt(value) || 0) : value
    });
  };

  const handleSubmit = async () => {
    // Validate the form
    if (!formData.name.trim()) {
      alert("Please enter patient name");
      return;
    }
    
    if (!formData.phone.trim()) {
      alert("Please enter phone number");
      return;
    }
    
    try {
      console.log("Creating patient with data:", formData);
      setIsSubmitting(true);
      
      // Add the patient to our store with explicit userCreated flag
      const newPatient = await addPatient({
        ...formData,
        // Ensure proper format for key fields
        height: formData.height ? `${formData.height} cm` : "",
        weight: formData.weight ? `${formData.weight} kg` : "",
        userCreated: true // Explicitly set this to true
      });
      
      console.log("Patient created successfully:", newPatient);
      
      // Reset form
      setFormData({
        name: "",
        age: 0,
        gender: "male",
        phone: "",
        email: "",
        height: "",
        weight: "",
        bloodPressure: "",
        medicalHistory: ""
      });
      
      // Notify other components that data has changed
      globalEventEmitter.emit('DATA_CHANGED');
      
      // Close dialog
      onDismiss();
      
      // Call success callback with new patient ID
      onSuccess(newPatient.id);
    } catch (error) {
      console.error("Error adding patient:", error);
      alert(`Failed to create patient: ${error.message || "Unknown error"}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>New Patient</ThemedText>
          </View>
          
          {/* Personal Information Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="user" size={18} color={primaryColor} style={styles.sectionIcon} />
            <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Full Name <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TextInput
              mode="outlined"
              value={formData.name}
              onChangeText={(text) => handleChange("name", text)}
              placeholder="Enter patient's full name"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Age <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TextInput
              mode="outlined"
              value={formData.age === 0 ? "" : formData.age.toString()}
              onChangeText={(text) => handleChange("age", text)}
              placeholder="Age"
              keyboardType="numeric"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="user-alt" size={16} color={primaryColor} />} />}
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <View style={styles.buttonGroup}>
              {['Male', 'Female', 'Other'].map((gender) => (
                <Button
                  key={gender}
                  mode={formData.gender === gender ? "contained" : "outlined"}
                  onPress={() => handleChange("gender", gender)}
                  style={[
                    styles.genderButton,
                    formData.gender === gender && { backgroundColor: primaryColor }
                  ]}
                  textColor={formData.gender === gender ? "white" : primaryColor}
                >
                  {gender}
                </Button>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Phone <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TextInput
              mode="outlined"
              value={formData.phone}
              onChangeText={(text) => handleChange("phone", text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="phone" size={16} color={primaryColor} />} />}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              mode="outlined"
              value={formData.email}
              onChangeText={(text) => handleChange("email", text)}
              placeholder="Enter email address"
              keyboardType="email-address"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="envelope" size={16} color={primaryColor} />} />}
            />
          </View>

          {/* Section Divider */}
          <Divider style={styles.sectionDivider} />

          {/* Health Information Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="heartbeat" size={18} color={primaryColor} style={styles.sectionIcon} />
            <ThemedText style={styles.sectionTitle}>Health Information</ThemedText>
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.halfWidth, { marginRight: 8 }]}>
              <ThemedText style={styles.label}>Height (cm)</ThemedText>
              <TextInput
                mode="outlined"
                value={formData.height}
                onChangeText={(text) => handleChange("height", text)}
                placeholder="Height"
                keyboardType="numeric"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor={primaryColor}
                left={<TextInput.Icon icon={() => <FontAwesome5 name="ruler-vertical" size={16} color={primaryColor} />} />}
              />
            </View>
            
            <View style={[styles.formGroup, styles.halfWidth]}>
              <ThemedText style={styles.label}>Weight (kg)</ThemedText>
              <TextInput
                mode="outlined"
                value={formData.weight}
                onChangeText={(text) => handleChange("weight", text)}
                placeholder="Weight"
                keyboardType="numeric"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor={primaryColor}
                left={<TextInput.Icon icon={() => <FontAwesome5 name="weight" size={16} color={primaryColor} />} />}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Blood Pressure</ThemedText>
            <TextInput
              mode="outlined"
              value={formData.bloodPressure}
              onChangeText={(text) => handleChange("bloodPressure", text)}
              placeholder="e.g., 120/80"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="heart" size={16} color={primaryColor} />} />}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Medical History</ThemedText>
            <TextInput
              mode="outlined"
              value={formData.medicalHistory}
              onChangeText={(text) => handleChange("medicalHistory", text)}
              placeholder="Relevant medical history, allergies, etc."
              multiline
              numberOfLines={4}
              style={styles.textArea}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
            />
          </View>
        
          {/* Action Section */}
          <View style={styles.actionSection}>
            <ThemedText style={styles.note}><ThemedText style={styles.required}>*</ThemedText> Required fields</ThemedText>
            
            <View style={styles.actions}>
              <Button 
                mode="outlined" 
                onPress={onDismiss}
                style={styles.cancelButton}
                textColor="#757575"
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSubmit}
                style={styles.submitButton}
                buttonColor={primaryColor}
                textColor="#ffffff"
              >
                Save Patient
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDivider: {
    marginVertical: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    height: 100,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  genderButton: {
    flex: 1,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  actionSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    marginRight: 12,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  submitButton: {
    borderRadius: 8,
  },
}); 