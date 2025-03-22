import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, FlatList } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Calendar } from 'react-native-calendars';
import { 
  Button, 
  TextInput, 
  IconButton, 
  Text, 
  Divider,
  TouchableRipple,
  Portal,
  Modal,
  Card,
  Appbar,
  Surface,
  useTheme,
  MD3Colors,
  Avatar,
  List,
  Searchbar
} from 'react-native-paper';
import { Patient } from '@/utils/patientStore';
import usePatientStorage from '@/utils/usePatientStorage';
import { ThemedText } from '@/components/ThemedText';

interface AppointmentSchedulerProps {
  isVisible: boolean;
  onClose: () => void;
  onSchedule: (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => void;
  patientName?: string;
  patientId?: string;
}

export function AppointmentScheduler({ 
  isVisible, 
  onClose, 
  onSchedule,
  patientName,
  patientId
}: AppointmentSchedulerProps) {
  const theme = useTheme();
  const primaryColor = theme.colors.primary;
  
  // Get patients
  const { patients, loading } = usePatientStorage();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const initializedRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // References for ScrollView components to control scroll position
  const hourScrollViewRef = useRef<ScrollView>(null);
  const minuteScrollViewRef = useRef<ScrollView>(null);
  const amPmScrollViewRef = useRef<ScrollView>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 400;

  // Time selection options
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState('AM');
  
  // Temporary values for time picker
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempAmPm, setTempAmPm] = useState('AM');
  
  // Filter to only show user-created patients
  const userCreatedPatients = useMemo(() => {
    return patients.filter(patient => patient.userCreated === true);
  }, [patients]);
  
  // Initialize patients list on mount
  useEffect(() => {
    // Use only user-created patients
    setFilteredPatients(userCreatedPatients);
  }, [userCreatedPatients]);

  // Find patient by ID effect
  useEffect(() => {
    // Find and set selected patient based on patientId prop
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patientId, patients]);

  // Initialize form values when the component becomes visible
  useEffect(() => {
    if (isVisible) {
      // Only reset the patient selection if this is the first time opening
      if (!wasVisibleRef.current && !patientId) {
        setSelectedPatient(null);
      }
      
      // Initialize time and form fields only on first visibility
      if (!initializedRef.current) {
        initializedRef.current = true;
        
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        
        // Round up to the next 30-minute interval
        if (minutes > 30) {
          hours += 1;
          minutes = 0;
        } else if (minutes > 0) {
          minutes = 30;
        }
        
        // If we've gone past the end of the day, roll over to tomorrow
        if (hours >= 24) {
          hours = 0;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setDate(tomorrow);
        } else {
          setDate(now); // Set to today if not rolling over
        }
        
        // Convert to 12-hour format
        let ampm = hours >= 12 ? 'PM' : 'AM';
        let hours12 = hours % 12;
        if (hours12 === 0) hours12 = 12;
        
        setSelectedHour(hours12);
        setSelectedMinute(minutes);
        setSelectedAmPm(ampm);
        
        // Only reset search and form fields on first open
        setPatientSearch('');
        setReason('');
        setNotes('');
      }
      
      // Set the wasVisible ref to true since we're now visible
      wasVisibleRef.current = true;
    } else {
      // Set wasVisibleRef to false when component is hidden
      wasVisibleRef.current = false;
    }
  }, [isVisible, patientId, patients]);
  
  // Filter patients based on search query
  useEffect(() => {
    if (patientSearch.trim() === '') {
      setFilteredPatients(userCreatedPatients);
    } else {
      const query = patientSearch.toLowerCase();
      const filtered = userCreatedPatients.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        patient.phone.includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [patientSearch, userCreatedPatients]);

  // Initialize temporary values when opening time picker
  useEffect(() => {
    if (showTimePicker) {
      setTempHour(selectedHour);
      setTempMinute(selectedMinute);
      setTempAmPm(selectedAmPm);
    }
  }, [showTimePicker, selectedHour, selectedMinute, selectedAmPm]);

  // Validate form whenever relevant fields change
  useEffect(() => {
    const valid = !!selectedPatient && reason.trim().length > 0;
    setIsFormValid(valid);
  }, [selectedPatient, reason]);

  // Function to scroll to center the selected item
  const scrollToSelected = (ref: React.RefObject<ScrollView>, index: number, itemHeight: number) => {
    if (ref.current) {
      // Calculate position to center the selected item
      ref.current.scrollTo({
        y: index * itemHeight + 15, // 60 is approximately half the visible height
        animated: true
      });
    }
  };
  
  // Scroll to selected items when they change
  useEffect(() => {
    if (showTimePicker) {
      // Find the index of the selected hour (1-12)
      const hourIndex = tempHour - 1;
      // Find the index of the selected minute (in 5 minute intervals)
      const minuteIndex = tempMinute / 5;
      // Find the index of AM/PM (0 for AM, 1 for PM)
      const amPmIndex = tempAmPm === 'AM' ? 0 : 1;
      
      // Use setTimeout to ensure the scrolling happens after render
      setTimeout(() => {
        scrollToSelected(hourScrollViewRef, hourIndex, 48); // 48 = item height + margins
        scrollToSelected(minuteScrollViewRef, minuteIndex, 48);
        scrollToSelected(amPmScrollViewRef, amPmIndex, 48);
      }, 100);
    }
  }, [tempHour, tempMinute, tempAmPm, showTimePicker]);

  const formatTime = (hour: number, minute: number, ampm: string) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSchedule = () => {
    // Make sure all required fields are filled
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }
    
    if (!reason.trim()) {
      alert('Please enter a reason for the appointment');
      return;
    }
    
    // Convert 12h to 24h format for the Date object
    let hour24 = selectedHour;
    if (selectedAmPm === 'PM' && selectedHour < 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    // Create a new date with the selected time
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hour24, selectedMinute);
    
    onSchedule({
      date: scheduledDate,
      time: formatTime(selectedHour, selectedMinute, selectedAmPm),
      reason,
      notes,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name
    });
    
    // Reset form
    setDate(new Date());
    setReason('');
    setNotes('');
    if (!patientId) {
      setSelectedPatient(null);
    }
    onClose();
  };

  const handleDateSelect = (day: any) => {
    const selectedDate = new Date(day.dateString);
    setDate(selectedDate);
    setShowDatePicker(false);
  };
  
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientPicker(false);
  };
  
  const renderCalendar = () => (
    <Portal>
      <Modal visible={showDatePicker} onDismiss={() => setShowDatePicker(false)} contentContainerStyle={styles.modalContainer}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Select Date</ThemedText>
        </View>
        <Calendar 
          onDayPress={handleDateSelect}
          markedDates={{
            [date.toISOString().split('T')[0]]: {selected: true, selectedColor: primaryColor}
          }}
          theme={{
            selectedDayBackgroundColor: primaryColor,
            todayTextColor: primaryColor,
            arrowColor: primaryColor,
          }}
        />
        <View style={styles.actions}>
          <Button 
            mode="outlined" 
            onPress={() => setShowDatePicker(false)}
            style={styles.cancelButton}
            textColor="#757575"
          >
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
  
  const handleSaveTime = () => {
    setSelectedHour(tempHour);
    setSelectedMinute(tempMinute);
    setSelectedAmPm(tempAmPm);
    setShowTimePicker(false);
  };
  
  const handleCancelTime = () => {
    setShowTimePicker(false);
  };
  
  const renderTimeSelector = () => {
    // Generate arrays for hours, minutes, and AM/PM
    const hours = Array.from({length: 12}, (_, i) => i + 1);
    const minutes = Array.from({length: 12}, (_, i) => i * 5);
    const ampm = ['AM', 'PM'];
    
    const renderTimeItem = (value: number | string, isSelected: boolean, type: 'hour' | 'minute' | 'ampm') => {
      const displayValue = type === 'minute' ? value.toString().padStart(2, '0') : value;
      return (
        <TouchableRipple
          key={value.toString()}
          style={[
            styles.timeItem,
            isSelected && { backgroundColor: primaryColor + '20' }
          ]}
          onPress={() => {
            if (type === 'hour') setTempHour(value as number);
            else if (type === 'minute') setTempMinute(value as number);
            else setTempAmPm(value as string);
          }}
        >
          <ThemedText style={[
            styles.timeItemText,
            isSelected && { color: primaryColor, fontWeight: 'bold' }
          ]}>
            {displayValue}
          </ThemedText>
        </TouchableRipple>
      );
    };
    
    return (
      <Portal>
        <Modal visible={showTimePicker} onDismiss={handleCancelTime} contentContainerStyle={styles.modalContainer}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Select Time</ThemedText>
          </View>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerWrapper}>
              <ThemedText style={styles.timePickerLabel}>Hour</ThemedText>
              <ScrollView
                ref={hourScrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.timePickerColumn}
              >
                {hours.map(hour => renderTimeItem(hour, hour === tempHour, 'hour'))}
              </ScrollView>
            </View>
            
            <View style={styles.timePickerWrapper}>
              <ThemedText style={styles.timePickerLabel}>Minute</ThemedText>
              <ScrollView
                ref={minuteScrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.timePickerColumn}
              >
                {minutes.map(minute => renderTimeItem(minute, minute === tempMinute, 'minute'))}
              </ScrollView>
            </View>
            
            <View style={styles.timePickerWrapper}>
              <ThemedText style={styles.timePickerLabel}>AM/PM</ThemedText>
              <ScrollView
                ref={amPmScrollViewRef}
                showsVerticalScrollIndicator={false}
                style={styles.timePickerColumn}
              >
                {ampm.map(ap => renderTimeItem(ap, ap === tempAmPm, 'ampm'))}
              </ScrollView>
            </View>
          </View>
          
          <View style={styles.actions}>
            <Button 
              mode="outlined" 
              onPress={handleCancelTime}
              style={styles.cancelButton}
              textColor="#757575"
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveTime}
              style={styles.submitButton}
              buttonColor={primaryColor}
              textColor="#ffffff"
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };
  
  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableRipple onPress={() => handlePatientSelect(item)}>
      <List.Item
        title={item.name}
        description={`Phone: ${item.phone}`}
        left={props => (
          <Avatar.Text 
            size={40} 
            label={item.name.substring(0, 2).toUpperCase()} 
            style={[props.style, {backgroundColor: primaryColor}]}
          />
        )}
        titleStyle={styles.patientItemTitle}
        descriptionStyle={styles.patientItemDescription}
      />
    </TouchableRipple>
  );
  
  const renderPatientPicker = () => (
    <Portal>
      <Modal visible={showPatientPicker} onDismiss={() => setShowPatientPicker(false)} contentContainerStyle={styles.modalContainer}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Select Patient</ThemedText>
        </View>
        <Searchbar
          placeholder="Search patients..."
          onChangeText={text => setPatientSearch(text)}
          value={patientSearch}
          style={styles.searchBar}
          iconColor={primaryColor}
        />
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={item => item.id}
          style={styles.patientList}
          ListEmptyComponent={
            <View style={styles.emptyPatientList}>
              <FontAwesome5 name="user-plus" size={40} color={primaryColor} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No patients found</Text>
              <Text style={styles.emptySubText}>Create patients in the Patients tab</Text>
            </View>
          }
        />
        <View style={styles.actions}>
          <Button 
            mode="outlined" 
            onPress={() => setShowPatientPicker(false)}
            style={styles.cancelButton}
            textColor="#757575"
          >
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
  
  return (
    <Portal>
      <Modal visible={isVisible} onDismiss={onClose} contentContainerStyle={styles.modalContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Schedule Appointment</ThemedText>
          </View>
          
          {/* Patient Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="user" size={18} color={primaryColor} style={styles.sectionIcon} />
            <ThemedText style={styles.sectionTitle}>Patient Information</ThemedText>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Patient <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TouchableRipple
              onPress={() => !patientId && setShowPatientPicker(true)}
              disabled={!!patientId}
              style={[
                styles.patientSelector,
                { borderColor: selectedPatient ? primaryColor : '#E0E0E0' }
              ]}
            >
              <View style={styles.patientSelectorContent}>
                {selectedPatient ? (
                  <View style={styles.selectedPatientContainer}>
                    <Avatar.Text 
                      size={28} 
                      label={selectedPatient.name.substring(0, 2).toUpperCase()} 
                      style={{backgroundColor: primaryColor}}
                    />
                    <ThemedText style={styles.selectedPatientName}>{selectedPatient.name}</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.placeholderText}>Select a patient</ThemedText>
                )}
                {!patientId && (
                  <FontAwesome5 name="chevron-down" size={16} color="#757575" />
                )}
              </View>
            </TouchableRipple>
          </View>
          
          <Divider style={styles.sectionDivider} />
          
          {/* Appointment Details Section */}
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="calendar-alt" size={18} color={primaryColor} style={styles.sectionIcon} />
            <ThemedText style={styles.sectionTitle}>Appointment Details</ThemedText>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Date <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TouchableRipple
              onPress={() => setShowDatePicker(true)}
              style={styles.dateSelector}
            >
              <View style={styles.dateSelectorContent}>
                <FontAwesome5 name="calendar-alt" size={16} color={primaryColor} style={styles.dateIcon} />
                <ThemedText>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</ThemedText>
                <FontAwesome5 name="chevron-down" size={16} color="#757575" />
              </View>
            </TouchableRipple>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Time <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TouchableRipple
              onPress={() => setShowTimePicker(true)}
              style={styles.timeSelector}
            >
              <View style={styles.timeSelectorContent}>
                <FontAwesome5 name="clock" size={16} color={primaryColor} style={styles.timeIcon} />
                <ThemedText>{formatTime(selectedHour, selectedMinute, selectedAmPm)}</ThemedText>
                <FontAwesome5 name="chevron-down" size={16} color="#757575" />
              </View>
            </TouchableRipple>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Reason <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TextInput
              mode="outlined"
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for appointment"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={primaryColor}
              left={<TextInput.Icon icon={() => <FontAwesome5 name="clipboard" size={16} color={primaryColor} />} />}
            />
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Notes</ThemedText>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes"
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
                onPress={onClose}
                style={styles.cancelButton}
                textColor="#757575"
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSchedule}
                style={styles.submitButton}
                buttonColor={primaryColor}
                textColor="#ffffff"
                disabled={!isFormValid}
              >
                Schedule
              </Button>
            </View>
          </View>
        </ScrollView>
        
        {/* Render sub-dialogs */}
        {renderCalendar()}
        {renderTimeSelector()}
        {renderPatientPicker()}
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
  patientSelector: {
    height: 56,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  patientSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPatientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPatientName: {
    marginLeft: 12,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#757575',
  },
  dateSelector: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateIcon: {
    marginRight: 12,
  },
  timeSelector: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeIcon: {
    marginRight: 12,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
    marginVertical: 16,
  },
  timePickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  timePickerColumn: {
    width: '80%',
    height: 180,
  },
  timeItem: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 8,
  },
  timeItemText: {
    fontSize: 16,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  patientList: {
    maxHeight: 300,
  },
  patientItemTitle: {
    fontWeight: '500',
  },
  patientItemDescription: {
    fontSize: 12,
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
  emptyPatientList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    height: 200,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 12,
    color: '#757575',
  },
}); 