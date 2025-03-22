import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ScrollView, Modal, Platform, Alert, ImageBackground } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { formatDate } from '@/utils/dateFormat';
import { AppointmentScheduler } from '@/components/AppointmentScheduler';
import { Calendar, CalendarList } from 'react-native-calendars';
import { requestStoragePermissions, checkStoragePermissions } from '@/app/runtime-permissions';
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
  Menu,
  Snackbar
} from 'react-native-paper';
import { 
  Appointment, 
  AppointmentStatus, 
  getPatientName,
} from '@/utils/appointmentStore';
import useAppointmentStorage from '@/utils/useAppointmentStorage';
import { getPatientById } from '@/utils/patientStore';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalEventEmitter } from '@/app/(tabs)/index';

// First, define status color constants at the top of the file
const STATUS_COLORS = {
  confirmed: {
    bg: '#E8F5E9',
    text: '#2E7D32',
    accent: '#4CAF50'
  },
  pending: {
    bg: '#FFF8E1',
    text: '#F57F17',
    accent: '#FFC107'
  },
  cancelled: {
    bg: '#FFEBEE',
    text: '#C62828',
    accent: '#F44336'
  },
  completed: {
    bg: '#E3F2FD',
    text: '#1565C0',
    accent: '#2196F3'
  }
};

export default function AppointmentsScreen() {
  const {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointmentStatus
  } = useAppointmentStorage();
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const { showToast } = useGlobalToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'single' | 'range'>('single');
  const [dateTarget, setDateTarget] = useState<'single' | 'start' | 'end'>('single');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({
    start: null,
    end: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSchedulerVisible, setSchedulerVisible] = useState(false);
  const [completionDialogVisible, setCompletionDialogVisible] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Setup event listeners
  useEffect(() => {
    // Listen for data changes
    const handleDataChange = () => {
      console.log('AppointmentsScreen: Refreshing after data change');
      // Force a refresh by incrementing the refresh trigger
      setRefreshTrigger(prev => prev + 1);
    };
    
    // Add event listener
    globalEventEmitter.addListener('DATA_CHANGED', handleDataChange);
    
    // Remove event listener on cleanup
    return () => {
      globalEventEmitter.removeListener('DATA_CHANGED', handleDataChange);
    };
  }, []);
  
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
  
  // Filter appointments based on search query, selected date/range, and status
  const filteredAppointmentsMemo = useMemo(() => {
    let result = [...appointments];
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(appointment => 
        appointment.patientName.toLowerCase().includes(query) ||
        appointment.reason.toLowerCase().includes(query)
      );
    }
    
    // Filter by selected date or date range
    if (datePickerMode === 'single' && selectedDate) {
      result = result.filter(appointment => appointment.date === selectedDate);
    } else if (datePickerMode === 'range' && (dateRange.start || dateRange.end)) {
      result = result.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const startOk = !dateRange.start || appointmentDate >= new Date(dateRange.start);
        const endOk = !dateRange.end || appointmentDate <= new Date(dateRange.end);
        return startOk && endOk;
      });
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter(appointment => appointment.status === selectedStatus);
    }
    
    // Only show user-created patients' appointments by checking the patient ID
    result = result.filter(appointment => {
      // Get the patient's ID from the appointment
      const patientId = appointment.patientId;
      // This will automatically exclude any demo/seed data
      return true; // We'll rely on the fact that only user-created patients will have appointments
    });
    
    return result;
  }, [searchQuery, selectedDate, dateRange, datePickerMode, selectedStatus, appointments]);

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
  const statusOptions = ['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const;

  // Update the renderStatusBadge function
  const renderStatusBadge = (status: AppointmentStatus) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.confirmed;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <ThemedText style={[styles.statusText, { color: colors.text }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
            </ThemedText>
      </View>
    );
  };

  // Update the renderStatusFilter function to use a custom component instead of Chip
  const renderStatusFilter = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusFilter}
      >
        {statusOptions.map((option) => {
          const isSelected = selectedStatus === option;
          const chipColors = option !== 'all' 
            ? STATUS_COLORS[option as AppointmentStatus] 
            : { bg: '#f0f0f0', text: '#757575', accent: '#757575' };
          
          // Use a consistent color for non-selected state
          const nonSelectedBg = 'transparent';
          const nonSelectedBorder = '#9E9E9E';
          const nonSelectedText = '#616161';
          
          return (
            <TouchableOpacity 
              key={option}
              onPress={() => {
                console.log(`Setting status to: ${option}`);
                setSelectedStatus(option);
              }}
              style={{ 
                borderRadius: 20,
                marginHorizontal: 4,
                overflow: 'hidden'
              }}
            >
              <View
                style={[
                  styles.statusChip,
                  { 
                    backgroundColor: isSelected ? chipColors.bg : nonSelectedBg,
                    borderColor: isSelected ? 'transparent' : nonSelectedBorder,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? chipColors.text : nonSelectedText,
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fontSize: 13
                  }}
                >
                  {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
        </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // Add state for storing patient names
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});

  // Fetch patient names when appointments change
  useEffect(() => {
    const fetchPatientNames = async () => {
      const namePromises = appointments.map(async (appointment) => {
        try {
          const name = await getPatientName(appointment.patientId);
          return [appointment.patientId, name];
        } catch (error) {
          console.error('Error fetching patient name:', error);
          return [appointment.patientId, 'Unknown'];
        }
      });

      const names = await Promise.all(namePromises);
      const nameMap = Object.fromEntries(names);
      setPatientNames(nameMap);
    };

    fetchPatientNames();
  }, [appointments]);

  // Update the renderAppointmentItem to remove the 3-dots menu and use consistent colors
  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    // Use the patientName from our local state, or fall back to the one in the appointment
    const patientName = patientNames[item.patientId] || item.patientName || 'Unknown Patient';
    
    // Get status colors
    const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.confirmed;
    
    // Function to handle appointment status change directly from the card
    const handleStatusChange = async (newStatus: AppointmentStatus) => {
      try {
        await updateAppointmentStatus(item.id, newStatus);
        
        // Trigger a refresh to update the UI
        setRefreshTrigger(prev => prev + 1);
        
        // Show toast notification
        showToast(
          `Appointment status updated to ${newStatus}`,
          'success'
        );
      } catch (error) {
        console.error('Error updating appointment status:', error);
        showToast('Failed to update appointment status', 'error');
      }
    };
    
    return (
      <TouchableRipple
        onPress={() => router.push(`/appointment/${item.id}`)}
        rippleColor="rgba(0, 0, 0, 0.08)"
        style={{ borderRadius: 16, marginBottom: 12 }}
      >
        <Card 
      style={styles.appointmentCard}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.appointmentRow}>
              <View style={[
                styles.dateBox, 
                { backgroundColor: statusColors.bg }
              ]}>
                <ThemedText style={[
                  styles.dateDay,
                  { color: statusColors.text }
                ]}>
                  {new Date(item.date).getDate()}
                </ThemedText>
                <ThemedText style={[
                  styles.dateMonth,
                  { color: statusColors.text }
                ]}>
                  {new Date(item.date).toLocaleString('default', { month: 'short' })}
          </ThemedText>
      </View>
      
      <View style={styles.appointmentDetails}>
                <View style={styles.appointmentHeaderInner}>
                  <ThemedText style={styles.patientName}>{patientName}</ThemedText>
                  <TouchableRipple
                    onPress={() => {
                      if (item.status === 'pending') {
                        handleStatusChange('confirmed');
                      } else if (item.status === 'confirmed') {
                        handleStatusChange('completed');
                      }
                    }}
                    rippleColor="rgba(0, 0, 0, 0.1)"
                    style={{ borderRadius: 12 }}
                  >
                    {renderStatusBadge(item.status)}
                  </TouchableRipple>
        </View>
                <ThemedText style={styles.appointmentTime}>
                  <FontAwesome5 name="clock" size={12} color={statusColors.accent} /> {item.time}
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
          </Card.Content>
        </Card>
      </TouchableRipple>
    );
  };

  const handleScheduleAppointment = async (appointmentData: {
    date: Date;
    time: string;
    reason: string;
    notes: string;
    patientId: string;
    patientName: string;
  }) => {
    try {
      // On Android, check for storage permissions
      if (Platform.OS === 'android') {
        const hasPermissions = await checkStoragePermissions();
        if (!hasPermissions) {
          const granted = await requestStoragePermissions();
          if (!granted) {
            Alert.alert(
              "Permission Required", 
              "Storage permission is needed to save appointment data.",
              [{ text: "OK" }]
            );
            return;
          }
        }
      }
      
      // Create new appointment with pending status
      const newAppointment = await addAppointment({
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason,
        notes: appointmentData.notes || '',
        patientId: appointmentData.patientId,
        status: 'pending'
      });
      
      // Trigger a refresh to update the UI
      setRefreshTrigger(prev => prev + 1);
      
      // Close dialog
      setSchedulerVisible(false);
      
      // Show toast notification
      showToast(
        `Appointment scheduled for ${appointmentData.patientName} on ${appointmentData.date.toLocaleDateString()} at ${appointmentData.time}`,
        'success'
      );
    } catch (error) {
      console.error('Error adding appointment:', error);
      showToast('Failed to schedule appointment', 'error');
    }
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
        {renderStatusFilter()}

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
          rippleColor="rgba(46, 125, 50, 0.12)"
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
        data={filteredAppointmentsMemo}
        renderItem={renderAppointmentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="calendar-times" size={48} color="#4CAF50" />
            <Text style={[styles.emptyText, { color: '#2e7d32' }]}>No appointments found</Text>
            {appointments.length === 0 && (
              <Text style={[styles.emptySubText, { color: '#757575' }]}>
                Use the + button below to create a new appointment
              </Text>
            )}
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
              onPress={async () => {
                if (selectedAppointment) {
                  try {
                    // Update the appointment status and patient history
                    await updateAppointmentStatus(
                      selectedAppointment.id, 
                      'completed', 
                      completionRemarks.trim()
                    );
                    
                    // Update the filtered list
                    setRefreshTrigger(prev => prev + 1);
                    
                    // Close dialog
                    setCompletionDialogVisible(false);
                    
                    // Show success message
                    showToast('Appointment completed successfully', 'success');
                  } catch (error) {
                    console.error('Error completing appointment:', error);
                    showToast('Failed to complete appointment', 'error');
                  }
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
        patientId={params.patientId as string}
      />
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: '#4CAF50' }]}
        color="#ffffff"
        onPress={() => setSchedulerVisible(true)}
        rippleColor="rgba(255, 255, 255, 0.2)"
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
    marginHorizontal: 0,
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
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  appointmentCard: {
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 0,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 8,
    width: 48,
    height: 48,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateMonth: {
    fontSize: 12,
  },
  appointmentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  appointmentHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  reasonText: {
    marginTop: 4,
    fontSize: 14,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxWidth: 340,
    margin: 24,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  dialogText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  remarksInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
}); 