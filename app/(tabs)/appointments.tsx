import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ScrollView, Modal, Platform, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { formatDate } from '@/utils/dateFormat';
import { AppointmentScheduler } from '@/components/AppointmentScheduler';
import { Calendar, CalendarList } from 'react-native-calendars';
import { 
  Button, 
  IconButton, 
  Chip, 
  Searchbar, 
  Card, 
  Avatar, 
  Title, 
  Paragraph, 
  Divider,
  Text,
  Surface,
  TouchableRipple,
  FAB,
  Portal,
  Dialog,
  SegmentedButtons,
  Badge,
  useTheme,
  Appbar,
  TextInput as PaperTextInput,
  Menu
} from 'react-native-paper';
import { 
  MOCK_APPOINTMENTS, 
  Appointment, 
  AppointmentStatus, 
  getPatientName,
  addAppointment,
  sortAppointmentsByDateDesc,
  updateAppointmentStatus
} from '@/utils/appointmentStore';
import { getPatientById } from '@/utils/patientStore';

export default function AppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({start: null, end: null});
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'all'>('confirmed');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'single' | 'range'>('single');
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const [dateTarget, setDateTarget] = useState<'single' | 'start' | 'end'>('single');
  
  // For completion dialog
  const [completionDialogVisible, setCompletionDialogVisible] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
  
  // For menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Get patient info from URL params (if navigating from patient screen)
  const patientId = params.patientId as string | undefined;
  
  // Automatically open scheduler when navigating from patient screen
  useEffect(() => {
    if (patientId) {
      setSchedulerVisible(true);
    }
  }, [patientId]);
  
  // Sort helper function
  const sortAppointmentsByDateDesc = (appointments: Appointment[]) => {
    return [...appointments].sort((a, b) => {
      // Compare dates
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // If dates are equal, compare times
      if (dateA.getTime() === dateB.getTime()) {
        // Convert time strings like "09:30 AM" to comparable values
        const timeAparts = a.time.split(' ');
        const timeBparts = b.time.split(' ');
        
        const [hoursA, minutesA] = timeAparts[0].split(':').map(Number);
        const [hoursB, minutesB] = timeBparts[0].split(':').map(Number);
        
        // Convert to 24-hour format
        let hours24A = hoursA;
        if (timeAparts[1] === 'PM' && hoursA < 12) hours24A += 12;
        if (timeAparts[1] === 'AM' && hoursA === 12) hours24A = 0;
        
        let hours24B = hoursB;
        if (timeBparts[1] === 'PM' && hoursB < 12) hours24B += 12;
        if (timeBparts[1] === 'AM' && hoursB === 12) hours24B = 0;
        
        // Compare hours, then minutes
        if (hours24A !== hours24B) return hours24B - hours24A;
        return minutesB - minutesA;
      }
      
      // Sort by date (most recent first)
      return dateB.getTime() - dateA.getTime();
    });
  };
  
  // Initialize with sorted appointments
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>(
    sortAppointmentsByDateDesc(MOCK_APPOINTMENTS.filter(apt => apt.status === 'confirmed'))
  );
  
  // Filter appointments based on search query, selected date/range, and status
  useEffect(() => {
    let filtered = [...MOCK_APPOINTMENTS];
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment => 
        appointment.patientName.toLowerCase().includes(query) ||
        appointment.reason.toLowerCase().includes(query)
      );
    }
    
    // Filter by selected date or date range
    if (datePickerMode === 'single' && selectedDate) {
      filtered = filtered.filter(appointment => appointment.date === selectedDate);
    } else if (datePickerMode === 'range' && (dateRange.start || dateRange.end)) {
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const startOk = !dateRange.start || appointmentDate >= new Date(dateRange.start);
        const endOk = !dateRange.end || appointmentDate <= new Date(dateRange.end);
        return startOk && endOk;
      });
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === selectedStatus);
    }
    
    // Sort appointments by date (latest first)
    filtered = sortAppointmentsByDateDesc(filtered);
    
    setFilteredAppointments(filtered);
  }, [searchQuery, selectedDate, dateRange, datePickerMode, selectedStatus]);

  // Function to format the date filter for display
  const getFormattedDateRange = () => {
    if (datePickerMode === 'single') {
      return selectedDate ? formatDate(selectedDate) : 'Select Date';
    } else {
      if (dateRange.start && dateRange.end) {
        return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
      } else if (dateRange.start) {
        return `From ${formatDate(dateRange.start)}`;
      } else if (dateRange.end) {
        return `Until ${formatDate(dateRange.end)}`;
      } else {
        return 'Select Date Range';
      }
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setDateRange({start: null, end: null});
  };

  // Function to handle date selection from the calendar
  const handleDateSelect = (day: any) => {
    if (dateTarget === 'single') {
      setSelectedDate(day.dateString);
    } else if (dateTarget === 'start') {
      setDateRange({...dateRange, start: day.dateString});
    } else if (dateTarget === 'end') {
      setDateRange({...dateRange, end: day.dateString});
    }
  };
  
  // Custom date picker modal using react-native-calendars
  const renderDatePickerModal = () => {
    return (
      <Portal>
        <Dialog 
        visible={isDatePickerVisible}
          onDismiss={() => setDatePickerVisible(false)} 
          style={{ 
            backgroundColor: '#ffffff',
            borderRadius: 16,
            alignSelf: 'center',
            width: '90%',
            maxWidth: 480,
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            elevation: 4
          }}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#4CAF50',
            height: 56,
            paddingHorizontal: 16
          }}>
            <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={{padding: 8}}>
              <FontAwesome5 name="arrow-left" size={18} color="white" />
            </TouchableOpacity>
            <ThemedText style={{
              color: 'white',
              fontSize: 18,
              fontWeight: '600',
              marginLeft: 16
            }}>
                {datePickerMode === 'single' ? 'Select Date' : 'Select Date Range'}
              </ThemedText>
            </View>
            
          <View style={{ backgroundColor: '#ffffff', padding: 16 }}>
            <SegmentedButtons
              value={datePickerMode}
              onValueChange={(value) => setDatePickerMode(value as 'single' | 'range')}
              buttons={[
                { value: 'single', label: 'Single Date' },
                { value: 'range', label: 'Date Range' }
              ]}
              style={{ marginBottom: 16 }}
              theme={{ colors: { primary: '#2e7d32' }}}
            />
            
              {datePickerMode === 'single' ? (
              // Single date picker
              <View>
                <Text style={{ 
                  color: '#2e7d32', 
                  marginBottom: 8, 
                  fontSize: 16, 
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {selectedDate ? formatDate(selectedDate) : 'Select a date'}
                </Text>
                <Calendar
                  onDayPress={(day) => {
                    setDateTarget('single');
                    handleDateSelect(day);
                  }}
                  markedDates={selectedDate ? {
                    [selectedDate]: { selected: true, selectedColor: '#4CAF50' }
                  } : {}}
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
                </View>
              ) : (
              // Date range picker
                <View>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginBottom: 16
                }}>
                  <Surface style={{ 
                    backgroundColor: '#f1f8e9', 
                    padding: 12, 
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: '#2e7d32',
                  }} elevation={0}>
                    <Text style={{ color: '#2e7d32', fontWeight: '500', marginBottom: 4 }}>Start Date</Text>
                    <Text style={{ color: '#33691e', fontSize: 16 }}>
                      {dateRange.start ? formatDate(dateRange.start) : 'Not set'}
                    </Text>
                  </Surface>
                  <Surface style={{ 
                    backgroundColor: '#f1f8e9', 
                    padding: 12, 
                    borderRadius: 8,
                    flex: 1,
                    marginLeft: 8,
                    borderWidth: 1,
                    borderColor: '#2e7d32',
                  }} elevation={0}>
                    <Text style={{ color: '#2e7d32', fontWeight: '500', marginBottom: 4 }}>End Date</Text>
                    <Text style={{ color: '#33691e', fontSize: 16 }}>
                      {dateRange.end ? formatDate(dateRange.end) : 'Not set'}
                    </Text>
                  </Surface>
                  </View>
                  
                <SegmentedButtons
                  value={dateTarget}
                  onValueChange={(value) => setDateTarget(value as 'start' | 'end')}
                  buttons={[
                    { value: 'start', label: 'Set Start' },
                    { value: 'end', label: 'Set End' }
                  ]}
                  style={{ marginBottom: 16 }}
                  theme={{ colors: { primary: '#2e7d32' }}}
                />
                
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={{
                    ...(dateRange.start ? { [dateRange.start]: { startingDay: true, color: '#4CAF50', textColor: 'white' } } : {}),
                    ...(dateRange.end ? { [dateRange.end]: { endingDay: true, color: '#4CAF50', textColor: 'white' } } : {})
                  }}
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
                </View>
              )}
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-end', 
            padding: 16,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0'
          }}>
            <Button 
              mode="outlined"
                onPress={clearDateFilter}
              style={{ 
                marginRight: 12, 
                borderColor: '#4CAF50', 
                borderRadius: 8,
                borderWidth: 1.5
              }}
              textColor="#4CAF50"
              labelStyle={{
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              Clear
            </Button>
            <Button 
              mode="contained"
                onPress={() => setDatePickerVisible(false)}
              buttonColor="#4CAF50"
              textColor="#ffffff"
              style={{ 
                borderRadius: 8
              }}
              labelStyle={{
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              Apply
            </Button>
            </View>
        </Dialog>
      </Portal>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.primaryContainer;
      case 'pending':
        return theme.colors.secondaryContainer;
      case 'cancelled':
        return theme.colors.errorContainer;
      case 'completed':
        return theme.colors.tertiaryContainer;
      default:
        return theme.colors.onSurface;
    }
  };

  // Define status options for filter chips
  const statusOptions = ['confirmed', 'pending', 'completed', 'cancelled', 'all'] as const;

  // Function to render the status badge
  const renderStatusBadge = (status: AppointmentStatus) => {
    let bgColor, textColor;
    
    switch (status) {
      case 'confirmed':
        bgColor = '#E8F5E9';
        textColor = '#2E7D32';
        break;
      case 'pending':
        bgColor = '#FFF3E0';
        textColor = '#E65100';
        break;
      case 'cancelled':
        bgColor = '#FFEBEE';
        textColor = '#C62828';
        break;
      case 'completed':
        bgColor = '#E3F2FD';
        textColor = '#1565C0';
        break;
      default:
        bgColor = '#F5F5F5';
        textColor = '#757575';
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <ThemedText style={[styles.statusText, { color: textColor }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
            </ThemedText>
      </View>
    );
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    // Ensure we're always using the latest patient name from the store
    const patientName = getPatientName(item.patientId);
    
    // Get date styles based on status
    const isStatusPending = item.status === 'pending';
    
    // Show completion dialog
    const openCompletionDialog = () => {
      setAppointmentToComplete(item);
      setCompletionRemarks('');
      setCompletionDialogVisible(true);
    };
    
    // Add back the confirm appointment function
    const confirmAppointment = () => {
      // Update the appointment status
      updateAppointmentStatus(item.id, 'confirmed');
      
      // Update the filtered list
      setFilteredAppointments([...filteredAppointments]);
    };

    // Add proper completeAppointment function for the dialog
    const completeAppointment = () => {
      if (appointmentToComplete) {
        // Update the appointment status and patient history
        updateAppointmentStatus(
          appointmentToComplete.id, 
          'completed', 
          completionRemarks.trim()
        );
        
        // Update the filtered list
        setFilteredAppointments([...filteredAppointments]);
        
        // Close dialog
        setCompletionDialogVisible(false);
      }
    };
    
    return (
      <Card 
      style={styles.appointmentCard}
      onPress={() => router.push(`/patient/${item.patientId}`)}
    >
        <Card.Content>
      <View style={styles.appointmentHeader}>
            <View style={styles.appointmentRow}>
              <View style={[
                styles.dateBox, 
                isStatusPending ? styles.pendingDateBox : {}
              ]}>
                <ThemedText style={[
                  styles.dateDay,
                  isStatusPending ? styles.pendingDateText : {}
                ]}>
                  {new Date(item.date).getDate()}
                </ThemedText>
                <ThemedText style={[
                  styles.dateMonth,
                  isStatusPending ? styles.pendingDateText : {}
                ]}>
                  {new Date(item.date).toLocaleString('default', { month: 'short' })}
          </ThemedText>
      </View>
      
      <View style={styles.appointmentDetails}>
                <View style={styles.appointmentHeaderInner}>
                  <ThemedText style={styles.patientName}>{patientName}</ThemedText>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'pending' ? styles.pendingBadge : {}
                  ]}>
                    <ThemedText style={[
                      styles.statusText,
                      item.status === 'pending' ? styles.pendingStatusText : {}
                    ]}>{item.status}</ThemedText>
        </View>
        </View>
                <ThemedText style={styles.appointmentTime}>
                  <FontAwesome5 name="clock" size={12} color={isStatusPending ? "#FF9800" : "#4CAF50"} /> {item.time}
                </ThemedText>
                <ThemedText style={styles.reasonText}>{item.reason}</ThemedText>
                
                {item.notes && (
                  <View style={{marginTop: 8}}>
                    <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
                    <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
                  </View>
                )}
        </View>
      </View>
      
            {/* Appointment actions */}
        <View style={styles.actionButtonsContainer}>
              {item.status === 'pending' && (
                <Menu
                  anchor={
                    <IconButton 
                      icon="dots-vertical" 
                      size={20}
                      style={{margin: 0, marginLeft: 16}}
                      iconColor="#4CAF50"
                      onPress={() => {
                        setSelectedAppointment(item);
                        setMenuVisible(true);
                      }}
                    />
                  }
                  visible={menuVisible && selectedAppointment?.id === item.id}
                  onDismiss={() => setMenuVisible(false)}
                  style={styles.menu}
                  contentStyle={styles.menuContent}
                >
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      confirmAppointment();
                    }}
                    title="Confirm Appointment" 
                    leadingIcon={props => <FontAwesome5 name="check-circle" size={16} color="#4CAF50" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      // Handle cancellation using the new function
                      updateAppointmentStatus(item.id, 'cancelled');
                      setFilteredAppointments([...filteredAppointments]);
                    }}
                    title="Cancel Appointment" 
                    leadingIcon={props => <FontAwesome5 name="times-circle" size={16} color="#F44336" {...props} />}
                    titleStyle={{color: '#F44336', fontWeight: '500', fontSize: 14}}
                    style={styles.menuItem}
                  />
                  <Divider style={{marginVertical: 2}} />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      alert(`Calling ${patientName}...`);
                    }}
                    title="Call Patient" 
                    leadingIcon={props => <FontAwesome5 name="phone" size={16} color="#2196F3" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      alert(`Sending message to ${patientName}...`);
                    }}
                    title="Message Patient" 
                    leadingIcon={props => <FontAwesome5 name="comment" size={16} color="#2196F3" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                </Menu>
              )}
              {item.status === 'confirmed' && (
                <Menu
                  anchor={
                    <IconButton 
                      icon="dots-vertical" 
                      size={20}
                      style={{margin: 0, marginLeft: 16}}
                      iconColor="#4CAF50"
                      onPress={() => {
                        setSelectedAppointment(item);
                        setMenuVisible(true);
                      }}
                    />
                  }
                  visible={menuVisible && selectedAppointment?.id === item.id}
                  onDismiss={() => setMenuVisible(false)}
                  style={styles.menu}
                  contentStyle={styles.menuContent}
                >
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      openCompletionDialog();
                    }}
                    title="Mark Completed" 
                    leadingIcon={props => <FontAwesome5 name="check-circle" size={16} color="#4CAF50" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                  <Divider style={{marginVertical: 2}} />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      alert(`Calling ${patientName}...`);
                    }}
                    title="Call Patient" 
                    leadingIcon={props => <FontAwesome5 name="phone" size={16} color="#2196F3" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      alert(`Sending message to ${patientName}...`);
                    }}
                    title="Message Patient" 
                    leadingIcon={props => <FontAwesome5 name="comment" size={16} color="#2196F3" {...props} />}
                    style={styles.menuItem}
                    titleStyle={{fontWeight: '500', fontSize: 14}}
                  />
                </Menu>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const handleScheduleAppointment = (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => {
    // Use the appointmentStore to add the appointment
    const newAppointment = addAppointment({
      date: appointmentData.date,
      time: appointmentData.time,
      reason: appointmentData.reason,
      notes: appointmentData.notes,
      patientId: appointmentData.patientId,
      status: 'pending'
    });
    
    // If the status matches our filter, add it to the filtered list
    if (selectedStatus === 'all' || selectedStatus === newAppointment.status) {
      const updatedAppointments = [...filteredAppointments, newAppointment];
      setFilteredAppointments(sortAppointmentsByDateDesc(updatedAppointments));
    }
    
    // Show toast notification
    alert(`Appointment scheduled for ${formatDate(newAppointment.date)} at ${newAppointment.time}`);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, {fontSize: 28, fontWeight: '700', color: '#2e7d32'}]}>Appointments</Text>
      </View>
      
      <Searchbar
        placeholder="Search appointments"
            onChangeText={setSearchQuery}
        value={searchQuery}
        style={[
          styles.searchBar, 
          { 
            backgroundColor: '#f1f8e9',
            borderWidth: 1,
            borderColor: '#2e7d32',
            borderRadius: 12,
            elevation: 0
          }
        ]}
        theme={{ colors: { primary: '#2e7d32' } }}
        iconColor="#2e7d32"
      />

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
          {statusOptions.map(status => (
            <Chip
              key={status}
              selected={selectedStatus === status}
              onPress={() => setSelectedStatus(status === selectedStatus ? 'all' : status)}
              style={[
                styles.statusChip, 
                {
                  borderColor: '#4CAF50',
                  backgroundColor: selectedStatus === status ? '#4CAF50' : 'transparent'
                }
              ]}
              mode={selectedStatus === status ? "flat" : "outlined"}
              selectedColor="#ffffff"
              textStyle={{ 
                color: selectedStatus === status ? '#ffffff' : '#4CAF50',
                fontWeight: selectedStatus === status ? 'bold' : 'normal',
                fontSize: 14
              }}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Chip>
          ))}
        </ScrollView>

        <TouchableRipple
          style={[
            styles.datePickerButton, 
            { 
              borderColor: '#2e7d32',
              borderWidth: 1,
              backgroundColor: selectedDate || dateRange.start || dateRange.end ? '#ebf7eb' : 'transparent',
              borderRadius: 12,
              height: 50
            }
          ]}
          onPress={() => setDatePickerVisible(true)}
          rippleColor="rgba(46, 125, 50, 0.16)"
        >
          <View style={styles.dateFilterContainer}>
            <FontAwesome5 name="calendar-alt" size={16} color="#2e7d32" style={styles.datePickerIcon} />
            <Text style={{ color: '#2e7d32', fontWeight: '500', fontSize: 16 }}>{getFormattedDateRange()}</Text>
            {(selectedDate || dateRange.start || dateRange.end) && (
              <IconButton
                icon="close"
                size={16}
                iconColor="#2e7d32"
                style={{ margin: 0, padding: 0 }}
                onPress={(e) => {
                  e.stopPropagation();
                  clearDateFilter();
                }}
              />
            )}
          </View>
        </TouchableRipple>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="calendar-times" size={48} color="#4CAF50" />
            <Text style={[styles.emptyText, { color: '#2e7d32' }]}>No appointments found</Text>
          </View>
        }
      />

      {/* Date Picker Modal */}
      {renderDatePickerModal()}

      {/* Appointment Completion Dialog */}
      <Portal>
        <Dialog 
          visible={completionDialogVisible} 
          onDismiss={() => setCompletionDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            <FontAwesome5 name="check-circle" size={16} color="#4CAF50" style={{marginRight: 6}} />
            Mark Appointment as Completed
          </Dialog.Title>
          <Dialog.Content>
            <ThemedText style={styles.dialogText}>
              Are you sure you want to mark this appointment as completed?
            </ThemedText>
            <PaperTextInput
              label="Notes/Remarks (optional)"
              value={completionRemarks}
              onChangeText={setCompletionRemarks}
              style={styles.remarksInput}
              mode="outlined"
              multiline
              numberOfLines={2}
              outlineColor="#E0E0E0"
              activeOutlineColor="#4CAF50"
              dense
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setCompletionDialogVisible(false)} 
              textColor="#757575"
              labelStyle={{fontSize: 13}}
            >
              No
            </Button>
            <Button 
              onPress={() => {
                if (appointmentToComplete) {
                  // Update the appointment status and patient history
                  updateAppointmentStatus(
                    appointmentToComplete.id, 
                    'completed', 
                    completionRemarks.trim()
                  );
                  
                  // Update the filtered list
                  setFilteredAppointments([...filteredAppointments]);
                  
                  // Close dialog
                  setCompletionDialogVisible(false);
                }
              }}
              mode="contained" 
              buttonColor="#4CAF50"
              style={{borderRadius: 8}}
              labelStyle={{fontSize: 13}}
            >
              Yes, Complete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <AppointmentScheduler
        isVisible={isSchedulerVisible}
        onClose={() => setSchedulerVisible(false)}
        onSchedule={handleScheduleAppointment}
        patientId={patientId as string}
      />
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: '#4CAF50' }]}
        color="#ffffff"
        onPress={() => setSchedulerVisible(true)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    backgroundColor: '#f8f9fa', // Light background for the whole screen
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700', // Bolder iOS-style font weight
    color: '#2e7d32',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 0, // Remove shadow for iOS-like appearance
    borderRadius: 12, // More rounded corners
  },
  filtersContainer: {
    marginBottom: 16,
  },
  statusFilter: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statusChip: {
    marginHorizontal: 4,
    borderRadius: 20, // More rounded iOS-style pill
    height: 36,
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: '100%',
    height: '100%',
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: 12, // More rounded corners
    marginHorizontal: 16,
  },
  datePickerIcon: {
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2e7d32',
  },
  appointmentCard: {
    marginBottom: 12,
    borderRadius: 16, // iOS-style more rounded cards
    overflow: 'hidden',
    backgroundColor: 'white', // Light green background for cards
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 8,
    width: 48,
    height: 48,
  },
  pendingDateBox: {
    backgroundColor: '#FFF3E0',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pendingDateText: {
    color: '#E65100',
  },
  dateMonth: {
    fontSize: 12,
    color: '#2E7D32',
  },
  appointmentDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  appointmentHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  pendingStatusText: {
    color: '#E65100',
  },
  reasonText: {
    fontSize: 14,
    marginTop: 4,
  },
  notesLabel: {
    fontWeight: '600',
    color: '#757575',
    fontSize: 12,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#616161',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 4,
    padding: 4,
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 16,
    marginBottom: 4,
  },
  dialogText: {
    marginBottom: 12,
    fontSize: 14,
  },
  remarksInput: {
    backgroundColor: '#f8f9fa',
    marginBottom: 4,
    fontSize: 14,
  },
  dialogActions: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    padding: 8,
  },
}); 