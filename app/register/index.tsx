import { StyleSheet, ScrollView, View } from "react-native";
import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { 
  TextInput, 
  Button, 
  Text, 
  Divider, 
  Surface, 
  SegmentedButtons,
  Appbar
} from 'react-native-paper';
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { addPatient, PatientFormData } from "@/utils/patientStore";

export default function PatientRegistrationScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    age: 0,
    gender: "Male",
    phone: "",
    email: "",
    height: "",
    weight: "",
    bloodPressure: "",
    medicalHistory: ""
  });

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
    
    // Add the patient to our store
    const newPatient = await addPatient({
      ...formData,
      // Ensure proper format for key fields
      height: formData.height ? `${formData.height} cm` : "",
      weight: formData.weight ? `${formData.weight} kg` : "",
    });
    
    alert(`Patient ${formData.name} registered successfully!`);
    
    // Navigate to the new patient's details page
    router.push(`/patient/${newPatient.id}`);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction color="white" onPress={() => router.back()} />
        <Appbar.Content 
          title="Patient Registration" 
          titleStyle={styles.appBarTitle}
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>New Patient</ThemedText>
        </View>
        
        {/* Single Card for all information */}
        <Surface style={styles.card} elevation={1}>
          {/* Personal Information Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="user" size={18} color="#4CAF50" style={styles.sectionIcon} />
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="user-alt" size={16} color="#4CAF50" />} />}
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <SegmentedButtons
              value={formData.gender}
              onValueChange={(value) => handleChange("gender", value)}
              buttons={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              style={styles.segmentedButtons}
              theme={{ colors: { primary: '#4CAF50', secondaryContainer: '#E8F5E9', onSecondaryContainer: '#1B5E20' }}}
              density="small"
            />
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="phone" size={16} color="#4CAF50" />} />}
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="envelope" size={16} color="#4CAF50" />} />}
            />
          </View>

          {/* Section Divider */}
          <Divider style={styles.sectionDivider} />

          {/* Health Information Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="heartbeat" size={18} color="#4CAF50" style={styles.sectionIcon} />
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
                activeOutlineColor="#4CAF50"
                theme={{ colors: { primary: '#4CAF50' } }}
                left={<TextInput.Icon icon={() => <FontAwesome5 name="ruler-vertical" size={16} color="#4CAF50" />} />}
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
                activeOutlineColor="#4CAF50"
                theme={{ colors: { primary: '#4CAF50' } }}
                left={<TextInput.Icon icon={() => <FontAwesome5 name="weight" size={16} color="#4CAF50" />} />}
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="heart" size={16} color="#4CAF50" />} />}
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
              activeOutlineColor="#4CAF50"
              theme={{ colors: { primary: '#4CAF50' } }}
            />
          </View>
        
          {/* Section Divider */}
          <Divider style={styles.sectionDivider} />
          
          {/* Action Section */}
          <View style={styles.actionSection}>
            <ThemedText style={styles.note}><ThemedText style={styles.required}>*</ThemedText> Required fields</ThemedText>
            
            <View style={styles.actions}>
              <Button 
                mode="outlined" 
                onPress={() => router.back()}
                style={styles.cancelButton}
                textColor="#757575"
                icon={() => <FontAwesome5 name="times" size={16} color="#757575" />}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSubmit}
                style={styles.submitButton}
                buttonColor="#4CAF50"
                textColor="#ffffff"
                disabled={!formData.name.trim() || !formData.phone.trim() || formData.age <= 0}
                icon={() => <FontAwesome5 name="user-plus" size={16} color="#ffffff" />}
              >
                Register Patient
              </Button>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  appBar: {
    backgroundColor: '#4CAF50',
    elevation: 0,
  },
  appBarTitle: {
    color: 'white', 
    fontSize: 18,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    overflow: 'hidden',
    backgroundColor: 'white',
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
    width: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
  },
  sectionDivider: {
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    minHeight: 100,
  },
  segmentedButtons: {
    backgroundColor: '#FAFAFA',
  },
  actionSection: {
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
  },
  note: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 16,
  }
});
