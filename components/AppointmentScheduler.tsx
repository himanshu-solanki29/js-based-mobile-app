import React, { useState, useEffect, useRef } from 'react';
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
  Dialog,
  Card,
  Appbar,
  Surface,
  useTheme,
  MD3Colors,
  Avatar,
  List,
  Searchbar
} from 'react-native-paper';
import { usePatients, Patient } from '@/utils/patientStore';
import { addAppointment } from '@/utils/appointmentStore';

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
  const { patientsArray } = usePatients();
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
  
  // Initialize patients list on mount
  useEffect(() => {
    setFilteredPatients(patientsArray);
  }, [patientsArray]);

  // Initialize form values when the component becomes visible
  useEffect(() => {
    if (isVisible) {
      // Set patient if patientId is provided
      if (patientId) {
        const patient = patientsArray.find(p => p.id === patientId);
        if (patient) {
          setSelectedPatient(patient);
        }
      } else if (!wasVisibleRef.current) {
        // Only reset the patient selection if this is the first time opening
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
  }, [isVisible, patientId, patientsArray]);
  
  // Filter patients based on search query
  useEffect(() => {
    if (patientSearch.trim() === '') {
      setFilteredPatients(patientsArray);
    } else {
      const query = patientSearch.toLowerCase();
      const filtered = patientsArray.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        patient.phone.includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [patientSearch, patientsArray]);

  // Initialize temporary values when opening time picker
  useEffect(() => {
    if (showTimePicker) {
      setTempHour(selectedHour);
      setTempMinute(selectedMinute);
      setTempAmPm(selectedAmPm);
    }
  }, [showTimePicker, selectedHour, selectedMinute, selectedAmPm]);

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
    // Make sure a patient is selected
    if (!selectedPatient) {
      alert('Please select a patient');
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

  // Calendar UI
  const renderCalendar = () => (
    <Calendar
      onDayPress={handleDateSelect}
      markedDates={{
        [date.toISOString().split('T')[0]]: { selected: true, selectedColor: '#4CAF50' }
      }}
      minDate={new Date().toISOString().split('T')[0]}
      theme={{
        calendarBackground: '#ffffff',
        textSectionTitleColor: '#555555',
        selectedDayBackgroundColor: '#4CAF50',
        selectedDayTextColor: '#ffffff',
        todayTextColor: '#4CAF50',
        dayTextColor: '#333333',
        textDisabledColor: '#cccccc',
        arrowColor: '#4CAF50',
        monthTextColor: '#2e7d32',
        indicatorColor: '#4CAF50',
        dotColor: '#4CAF50'
      }}
    />
  );

  // Save selected time when clicking check button
  const handleSaveTime = () => {
    setSelectedHour(tempHour);
    setSelectedMinute(tempMinute);
    setSelectedAmPm(tempAmPm);
    setShowTimePicker(false);
  };
  
  // Cancel time changes
  const handleCancelTime = () => {
    setShowTimePicker(false);
  };

  // Generate time selector UI
  const renderTimeSelector = () => {
    return (
      <View style={styles.timeSelector}>
        <View style={styles.timeSelectorRow}>
          {/* Hour Selector */}
          <View style={styles.timePickerColumn}>
            <Text style={[styles.timePickerLabel, { color: '#2e7d32' }]}>Hour</Text>
            <ScrollView 
              ref={hourScrollViewRef}
              style={[styles.timeScrollView, { height: 160 }]} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 60 }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                <TouchableRipple
                  key={`hour-${hour}`}
                  style={[
                    styles.timeOption,
                    tempHour === hour && [styles.selectedTimeOption, {backgroundColor: '#4CAF50'}]
                  ]}
                  onPress={() => {
                    setTempHour(hour);
                    scrollToSelected(hourScrollViewRef, hour - 1, 48);
                  }}
                  rippleColor="rgba(46, 125, 50, 0.16)"
                >
                  <Text style={[
                    { fontSize: 16 },
                    tempHour === hour ? styles.selectedTimeText : { color: '#2e7d32' }
                  ]}>
                    {hour}
                  </Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </View>

          <Text style={[styles.timeSeparator, { color: '#2e7d32' }]}>:</Text>
          
          {/* Minute Selector */}
          <View style={styles.timePickerColumn}>
            <Text style={[styles.timePickerLabel, { color: '#2e7d32' }]}>Minute</Text>
            <ScrollView 
              ref={minuteScrollViewRef}
              style={[styles.timeScrollView, { height: 160 }]} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 60 }}
            >
              {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                <TouchableRipple
                  key={`minute-${minute}`}
                  style={[
                    styles.timeOption,
                    tempMinute === minute && [styles.selectedTimeOption, {backgroundColor: '#4CAF50'}]
                  ]}
                  onPress={() => {
                    setTempMinute(minute);
                    scrollToSelected(minuteScrollViewRef, minute / 5, 48);
                  }}
                  rippleColor="rgba(46, 125, 50, 0.16)"
                >
                  <Text style={[
                    { fontSize: 16 },
                    tempMinute === minute ? styles.selectedTimeText : { color: '#2e7d32' }
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </View>

          {/* AM/PM Selector */}
          <View style={styles.timePickerColumn}>
            <Text style={[styles.timePickerLabel, { color: '#2e7d32' }]}>AM/PM</Text>
            <ScrollView
              ref={amPmScrollViewRef}
              style={[styles.timeScrollView, { height: 160 }]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 60 }}
            >
              {['AM', 'PM'].map((period, index) => (
                <TouchableRipple
                  key={`period-${period}`}
                  style={[
                    styles.timeOption,
                    tempAmPm === period && [styles.selectedTimeOption, {backgroundColor: '#4CAF50'}]
                  ]}
                  onPress={() => {
                    setTempAmPm(period);
                    scrollToSelected(amPmScrollViewRef, index, 48);
                  }}
                  rippleColor="rgba(46, 125, 50, 0.16)"
                >
                  <Text style={[
                    { fontSize: 16 },
                    tempAmPm === period ? styles.selectedTimeText : { color: '#2e7d32' }
                  ]}>
                    {period}
                  </Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };
  
  // Patient selector UI
  const renderPatientItem = ({ item }: { item: Patient }) => (
    <List.Item
      title={item.name}
      titleStyle={{ fontWeight: '500', fontSize: 16, color: '#333333' }}
      description={`Age: ${item.age} • Phone: ${item.phone}`}
      descriptionStyle={{ fontSize: 14, color: '#666666' }}
      left={props => <Avatar.Icon {...props} icon="account" style={{ backgroundColor: '#4CAF50', marginLeft: 12 }} />}
      onPress={() => handlePatientSelect(item)}
      style={[
        styles.patientItem,
        selectedPatient?.id === item.id && { backgroundColor: '#e8f5e9' }
      ]}
      rippleColor="rgba(46, 125, 50, 0.1)"
    />
  );

  return (
    <Portal>
      <Dialog
      visible={isVisible}
        onDismiss={onClose}
        style={{ 
          backgroundColor: '#f5f5f5',
          borderRadius: 10,
          maxWidth: 500,
          alignSelf: 'center',
          width: '90%',
          maxHeight: '85%',
          padding: 0,
          margin: 0,
          overflow: 'hidden'
        }}
      >
        <Appbar.Header style={{ backgroundColor: '#4CAF50', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
          <Appbar.Content 
            title={selectedPatient ? `Schedule for ${selectedPatient.name}` : "Schedule Appointment"} 
            titleStyle={{ color: 'white', fontSize: 18 }}
          />
          <Appbar.Action icon="close" color="white" onPress={onClose} />
        </Appbar.Header>

        <ScrollView style={{ flexGrow: 1 }}>
          <View style={styles.formContainer}>
            {/* Patient Selection */}
            <View style={styles.formGroup}>
              <Text variant="titleMedium" style={{ color: '#2e7d32', marginBottom: 8 }}>Patient</Text>
              <TouchableRipple
                style={[styles.datePickerButton, { borderColor: '#2e7d32', borderWidth: 1 }]}
                onPress={() => setShowPatientPicker(true)}
                rippleColor="rgba(46, 125, 50, 0.16)"
                disabled={!!patientId} // Disable if patientId is provided
              >
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="user" size={16} color="#2e7d32" style={styles.inputIcon} />
                  <Text style={{ color: '#33691e', fontSize: 16 }}>
                    {selectedPatient ? selectedPatient.name : 'Select Patient'}
                  </Text>
                </View>
              </TouchableRipple>
          </View>

          <View style={styles.formGroup}>
              <Text variant="titleMedium" style={{ color: '#2e7d32', marginBottom: 8 }}>Date</Text>
              <TouchableRipple
                style={[styles.datePickerButton, { borderColor: '#2e7d32', borderWidth: 1 }]}
              onPress={() => setShowDatePicker(true)}
                rippleColor="rgba(46, 125, 50, 0.16)"
              >
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#2e7d32" style={styles.inputIcon} />
                  <Text style={{ color: '#33691e', fontSize: 16 }}>{date.toLocaleDateString()}</Text>
                </View>
              </TouchableRipple>
            </View>

            <View style={styles.formGroup}>
              <Text variant="titleMedium" style={{ color: '#2e7d32', marginBottom: 8 }}>Time</Text>
              <TouchableRipple
                style={[styles.datePickerButton, { borderColor: '#2e7d32', borderWidth: 1 }]}
                onPress={() => setShowTimePicker(true)}
                rippleColor="rgba(46, 125, 50, 0.16)"
              >
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="clock" size={16} color="#2e7d32" style={styles.inputIcon} />
                  <Text style={{ color: '#33691e', fontSize: 16 }}>{formatTime(selectedHour, selectedMinute, selectedAmPm)}</Text>
                </View>
              </TouchableRipple>
          </View>

          <View style={styles.formGroup}>
              <Text variant="titleMedium" style={{ color: '#2e7d32', marginBottom: 8 }}>Reason</Text>
            <TextInput
                mode="outlined"
              value={reason}
              onChangeText={setReason}
                placeholder="Enter reason for appointment"
                style={styles.input}
                outlineColor="#2e7d32"
                activeOutlineColor="#4CAF50"
                theme={{ colors: { primary: '#4CAF50', background: '#f5f5f5' } }}
            />
          </View>

          <View style={styles.formGroup}>
              <Text variant="titleMedium" style={{ color: '#2e7d32', marginBottom: 8 }}>Notes</Text>
            <TextInput
                mode="outlined"
              value={notes}
              onChangeText={setNotes}
                placeholder="Add any additional notes"
              multiline
              numberOfLines={4}
                style={styles.textArea}
                outlineColor="#2e7d32"
                activeOutlineColor="#4CAF50"
                theme={{ colors: { primary: '#4CAF50', background: '#f5f5f5' } }}
            />
            </View>
          </View>

          <Surface style={[styles.actionContainer, { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }]} elevation={0}>
            <Button 
              mode="outlined" 
              onPress={onClose}
              style={[styles.button, { borderColor: '#2e7d32' }]}
              textColor="#2e7d32"
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
            onPress={handleSchedule}
              style={styles.button}
              buttonColor="#4CAF50"
              textColor="#ffffff"
              disabled={!reason.trim() || !selectedPatient}
            >
              Schedule
            </Button>
          </Surface>
        </ScrollView>
      </Dialog>

      <Dialog
        visible={showDatePicker}
        onDismiss={() => setShowDatePicker(false)}
        style={{ 
          backgroundColor: '#ffffff',
          borderRadius: 10,
          alignSelf: 'center',
          width: isSmallScreen ? '95%' : 360,
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <Appbar.Header style={{ backgroundColor: '#4CAF50', height: 56 }}>
          <Appbar.BackAction color="white" onPress={() => setShowDatePicker(false)} />
          <Appbar.Content 
            title="Select Date" 
            titleStyle={{ color: 'white', fontSize: 18 }}
          />
          <Appbar.Action icon="check" color="white" onPress={() => setShowDatePicker(false)} />
        </Appbar.Header>
        <Dialog.Content style={{ padding: 0 }}>
          {renderCalendar()}
        </Dialog.Content>
      </Dialog>

      <Dialog
        visible={showTimePicker}
        onDismiss={handleCancelTime}
        style={{ 
          backgroundColor: '#ffffff',
          borderRadius: 10,
          alignSelf: 'center',
          width: isSmallScreen ? '95%' : 360,
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <Appbar.Header style={{ backgroundColor: '#4CAF50', height: 56 }}>
          <Appbar.BackAction color="white" onPress={handleCancelTime} />
          <Appbar.Content 
            title="Select Time" 
            titleStyle={{ color: 'white', fontSize: 18 }}
          />
          <Appbar.Action icon="check" color="white" onPress={handleSaveTime} />
        </Appbar.Header>
        <Dialog.Content style={{ padding: 16 }}>
          <View style={styles.timeSelectorContainer}>
            {renderTimeSelector()}
            <View style={styles.centerIndicator} />
          </View>
        </Dialog.Content>
      </Dialog>
      
      {/* Patient Selector Dialog */}
      <Dialog
        visible={showPatientPicker}
        onDismiss={() => setShowPatientPicker(false)}
        style={{ 
          backgroundColor: '#ffffff',
          borderRadius: 10,
          alignSelf: 'center',
          width: '90%',
          maxWidth: 480,
          maxHeight: '80%',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <Appbar.Header style={{ backgroundColor: '#4CAF50', height: 56 }}>
          <Appbar.BackAction color="white" onPress={() => setShowPatientPicker(false)} />
          <Appbar.Content 
            title="Select Patient" 
            titleStyle={{ color: 'white', fontSize: 18 }}
          />
        </Appbar.Header>
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <Text style={{ color: '#555555', marginBottom: 8, fontSize: 14 }}>
            Search by name or phone number
          </Text>
          <Searchbar
            placeholder="Search patients..."
            onChangeText={setPatientSearch}
            value={patientSearch}
            style={{ 
              backgroundColor: '#f5f5f5',
              borderWidth: 1,
              borderColor: '#2e7d32',
              borderRadius: 8,
              elevation: 0
            }}
            iconColor="#2e7d32"
            theme={{ colors: { primary: '#2e7d32' }}}
          />
        </View>
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyPatientList}>
              <FontAwesome5 name="search" size={24} color="#2e7d32" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#2e7d32', fontSize: 16, fontWeight: '500' }}>No patients found</Text>
              <Text style={{ color: '#666666', textAlign: 'center', marginTop: 4 }}>
                Try a different search term or add a new patient
              </Text>
      </View>
          }
        />
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 0,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  datePickerButton: {
    borderRadius: 8,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    backgroundColor: '#ebf7eb',
  },
  input: {
    backgroundColor: '#ebf7eb',
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#ebf7eb',
    height: 100,
    fontSize: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    marginLeft: 12,
    minWidth: 100,
    borderRadius: 8,
  },
  timeSelectorContainer: {
    position: 'relative',
  },
  centerIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    marginTop: -24,
    zIndex: -1,
  },
  timeSelector: {
    paddingVertical: 8,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 160,
  },
  timePickerColumn: {
    alignItems: 'center',
    minWidth: 70,
  },
  timePickerLabel: {
    marginBottom: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  timeScrollView: {
    width: 70,
    height: 160,
  },
  timeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginVertical: 2,
    borderRadius: 8,
    height: 44,
  },
  selectedTimeOption: {
    borderRadius: 8,
  },
  selectedTimeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  timeSeparator: {
    fontSize: 24,
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  amPmContainer: {
    width: 70,
  },
  amPmOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  patientItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  emptyPatientList: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
}); 