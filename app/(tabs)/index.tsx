import { StyleSheet, View, TouchableOpacity, ScrollView, FlatList, Pressable, RefreshControl } from "react-native";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import { 
  updateAppointmentStatus,
  useAppointments,
  sortAppointmentsByDateDesc
} from "../../utils/appointmentStore";
import { Card, Badge, Button, Avatar, Surface, Title, Divider, ProgressBar, useTheme, IconButton, Menu, Dialog, TextInput, TouchableRipple } from 'react-native-paper';
import { usePatients } from '@/utils/patientStore';
import { Appointment, AppointmentStatus } from '../../utils/appointmentStore';
import { useGlobalToast } from "@/components/GlobalToastProvider";
import { INITIAL_PATIENTS } from '@/utils/initialData';
import { INITIAL_APPOINTMENTS } from '@/utils/initialData';
import { EventEmitter } from 'events';

// Create a global event emitter for app-wide events
export const globalEventEmitter = new EventEmitter();

// Define status color constants at the top of the file
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

// Function to get upcoming appointments is removed - we use the useAppointments hook

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useGlobalToast();
  const { patientsArray } = usePatients();
  const { appointments, upcomingAppointments } = useAppointments();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [weekAppointments, setWeekAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // For appointment actions
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completionDialogVisible, setCompletionDialogVisible] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  
  // Listen for data changes
  useEffect(() => {
    // Define the refresh handler
    const handleDataChange = () => {
      console.log('HomeScreen: Refreshing after data change');
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
  
  // Filter data to only show user-created data
  const filteredPatients = useMemo(() => {
    // Always filter out dummy patients (IDs 1-5) to only show user-created data
    const initialPatientIds = Object.keys(INITIAL_PATIENTS).map(id => id);
    return patientsArray.filter(patient => !initialPatientIds.includes(patient.id));
  }, [patientsArray]);
  
  const filteredAppointments = useMemo(() => {
    // Always filter out dummy appointments (IDs 1-7) to only show user-created data 
    const initialAppointmentIds = INITIAL_APPOINTMENTS.map(appointment => appointment.id);
    return appointments.filter(appointment => !initialAppointmentIds.includes(appointment.id));
  }, [appointments]);
  
  const filteredUpcomingAppointments = useMemo(() => {
    // Always filter out dummy appointments (IDs 1-7) to only show user-created data
    const initialAppointmentIds = INITIAL_APPOINTMENTS.map(appointment => appointment.id);
    return upcomingAppointments.filter(appointment => !initialAppointmentIds.includes(appointment.id));
  }, [upcomingAppointments]);
  
  // Limit upcoming appointments to maximum 6
  const limitedUpcomingAppointments = useMemo(() => {
    return filteredUpcomingAppointments.slice(0, 6);
  }, [filteredUpcomingAppointments]);
  
  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);
  
  // Calculate dashboard statistics with filtered data
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    // Today's appointments
    const todayCount = filteredAppointments.filter(a => a.date === today).length;
    setTodayAppointments(todayCount);
    
    // This week's appointments 
    const weekCount = filteredAppointments.filter(a => a.date >= weekStartStr).length;
    setWeekAppointments(weekCount);
    
    // Pending appointments
    const pendingCount = filteredAppointments.filter(a => a.status === 'pending').length;
    setPendingAppointments(pendingCount);
    
    // Completed appointments
    const completedCount = filteredAppointments.filter(a => a.status === 'completed').length;
    setCompletedAppointments(completedCount);
    
  }, [filteredAppointments, refreshTrigger]);
  
  // Handle marking appointment as completed
  const handleCompleteAppointment = () => {
    if (!selectedAppointment) return;
    
    setCompletionDialogVisible(false);
    setMenuVisible(false);
    
    // Find the appointment in the mock data
    const index = filteredAppointments.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1) {
      // Update the status with remarks if provided
      updateAppointmentStatus(selectedAppointment.id, 'completed', completionRemarks || undefined);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      showToast("Appointment marked as completed", "success");
      
      // Reset the form
      setCompletionRemarks('');
      setSelectedAppointment(null);
    }
  };
  
  // Handle confirming a pending appointment
  const handleConfirmAppointment = () => {
    if (!selectedAppointment) return;
    
    setConfirmDialogVisible(false);
    setMenuVisible(false);
    
    // Find the appointment in the mock data
    const index = filteredAppointments.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1 && filteredAppointments[index].status === 'pending') {
      // Update the status
      updateAppointmentStatus(selectedAppointment.id, 'confirmed');
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      showToast("Appointment confirmed", "success");
      
      // Reset the selected appointment
      setSelectedAppointment(null);
    }
  };
  
  // Handle cancelling a pending appointment
  const handleCancelAppointment = () => {
    if (!selectedAppointment) return;
    
    setCancelDialogVisible(false);
    setMenuVisible(false);
    
    // Find the appointment in the mock data
    const index = filteredAppointments.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1 && filteredAppointments[index].status === 'pending') {
      // Update the status
      updateAppointmentStatus(selectedAppointment.id, 'cancelled');
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      showToast("Appointment cancelled", "success");
      
      // Reset the selected appointment
      setSelectedAppointment(null);
    }
  };
  
  // Open menu for appointment actions
  const openMenu = (appointment) => {
    setSelectedAppointment(appointment);
    setMenuVisible(true);
  };
  
  // Open completion dialog
  const openCompletionDialog = () => {
    setMenuVisible(false);
    setCompletionDialogVisible(true);
  };
  
  // Open confirm dialog
  const openConfirmDialog = () => {
    setMenuVisible(false);
    setConfirmDialogVisible(true);
  };
  
  // Open cancel dialog
  const openCancelDialog = () => {
    setMenuVisible(false);
    setCancelDialogVisible(true);
  };
  
  const renderAppointmentMenu = (appointment: any) => {
    return (
      <Menu
        visible={menuVisible && selectedAppointment?.id === appointment.id}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <IconButton 
            icon="dots-vertical" 
            onPress={() => openMenu(appointment)}
            size={20}
            style={{margin: 0, marginLeft: 16}}
            iconColor="#4CAF50"
          />
        }
        style={styles.menu}
        contentStyle={styles.menuContent}
      >
        {appointment.status === 'pending' ? (
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              openConfirmDialog();
            }} 
            title="Confirm Appointment" 
            leadingIcon={props => <FontAwesome5 name="check-circle" size={16} color="#4CAF50" {...props} />}
            style={styles.menuItem}
            titleStyle={{fontWeight: '500', fontSize: 14}}
          />
        ) : null}
        
        {appointment.status === 'pending' ? (
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              openCancelDialog();
            }} 
            title="Cancel Appointment" 
            leadingIcon={props => <FontAwesome5 name="times-circle" size={16} color="#F44336" {...props} />}
            titleStyle={{color: '#F44336', fontWeight: '500', fontSize: 14}}
            style={styles.menuItem}
          />
        ) : (
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
        )}
      </Menu>
    );
  };
  
  const AppointmentItem = ({ item }: { item: Appointment }) => {
    // Get status colors based on the STATUS_COLORS object from appointments.tsx
    const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.confirmed;
    
    // Function to handle quick status update
    const handleQuickStatusUpdate = (event: any) => {
      event.stopPropagation();
      
      let newStatus: 'confirmed' | 'completed' | null = null;
      
      if (item.status === 'pending') {
        newStatus = 'confirmed';
      } else if (item.status === 'confirmed') {
        newStatus = 'completed';
      }
      
      if (newStatus) {
        // Update the status
        updateAppointmentStatus(item.id, newStatus);
        
        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
        
        // Show success message
        showToast(`Appointment ${newStatus}`, "success");
      }
    };
    
    // Render status badge similar to the appointments screen
    const renderStatusBadge = (status: AppointmentStatus) => {
      return (
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </ThemedText>
        </View>
      );
    };
    
    return (
      <TouchableRipple
        style={styles.appointmentItem}
        onPress={() => router.push(`/appointment/${item.id}`)}
        rippleColor="rgba(0, 0, 0, 0.08)"
      >
        <View style={styles.appointmentItemContent}>
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
              <ThemedText style={styles.patientName}>{item.patientName}</ThemedText>
              <TouchableRipple
                onPress={handleQuickStatusUpdate}
                rippleColor="rgba(0, 0, 0, 0.1)"
                style={{ borderRadius: 12 }}
              >
                {renderStatusBadge(item.status)}
              </TouchableRipple>
            </View>
            <ThemedText style={styles.appointmentTime}>
              <FontAwesome5 name="clock" size={12} color={statusColors.accent} /> {item.time}
            </ThemedText>
            <ThemedText style={styles.appointmentReason} numberOfLines={1} ellipsizeMode="tail">
              {item.reason}
            </ThemedText>
          </View>
        </View>
      </TouchableRipple>
    );
  };
  
  return (
      <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.welcomeText}>Welcome back</ThemedText>
            <ThemedText style={styles.title}>Dashboard</ThemedText>
          </View>
          <TouchableRipple 
            style={styles.profileButton} 
            onPress={() => router.push('/settings')}
            rippleColor="rgba(0, 0, 0, 0.1)"
          >
            <FontAwesome5 name="user-circle" size={32} color="#4CAF50" />
          </TouchableRipple>
        </View>
        
        <Surface style={styles.statsSurface} elevation={1}>
          <TouchableRipple
            onPress={() => router.push('/(tabs)/appointments')}
            rippleColor="rgba(0, 0, 0, 0.1)"
            style={{ borderRadius: 12 }}
          >
            <View>
              <View style={styles.statsRow}>
                <StatCard 
                  value={filteredPatients.length.toString()} 
                  label="Patients"
                  icon="users"
                  color="#4CAF50"
                />
                <StatCard 
                  value={todayAppointments.toString()} 
                  label="Today"
                  icon="calendar-day"
                  color="#FF9800"
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard 
                  value={weekAppointments.toString()} 
                  label="This Week"
                  icon="calendar-week"
                  color="#2196F3"
                />
                <StatCard 
                  value={pendingAppointments.toString()} 
                  label="Pending"
                  icon="clock"
                  color="#F44336"
                />
              </View>
            </View>
          </TouchableRipple>
        </Surface>

        {/* Upcoming Appointments Widget */}
        <Surface style={styles.widgetSurface} elevation={1}>
          <TouchableRipple
            onPress={() => router.push('/(tabs)/appointments')}
            rippleColor="rgba(0, 0, 0, 0.1)"
            style={{ borderRadius: 12 }}
          >
            <View style={styles.appointmentsContainer}>
              <View style={styles.widgetHeader}>
                <ThemedText style={styles.widgetTitle}>Upcoming Appointments</ThemedText>
                <Button 
                  mode="text" 
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/(tabs)/appointments');
                  }}
                  labelStyle={styles.seeAllText}
                  compact
                >
                  See All
                </Button>
              </View>
          
              {limitedUpcomingAppointments.length === 0 ? (
                <View style={styles.emptyContent}>
                  <FontAwesome5 name="calendar-check" size={32} color="#CCCCCC" />
                  <ThemedText style={styles.emptyText}>No appointments found</ThemedText>
                  <Button 
                    mode="outlined" 
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/(tabs)/appointments');
                    }}
                    style={styles.scheduleEmptyButton}
                    textColor="#4CAF50"
                  >
                    Schedule
                  </Button>
                </View>
              ) : (
                <ScrollView 
                  style={styles.appointmentsScrollView}
                  contentContainerStyle={styles.appointmentsScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {limitedUpcomingAppointments.map((item, index) => (
                    <View key={item.id} style={styles.appointmentItemContainer}>
                      {index > 0 && <Divider style={styles.appointmentDivider} />}
                      <AppointmentItem item={item} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableRipple>
        </Surface>
        
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Stats Overview</ThemedText>
        </View>

        <Surface style={styles.widgetSurface} elevation={1}>
          <TouchableRipple
            onPress={() => {}}
            rippleColor="rgba(0, 0, 0, 0.1)"
            style={{ borderRadius: 12 }}
          >
            <Card.Content style={styles.statsContent}>
              <View style={styles.statsMainRow}>
                <View style={styles.mainStatBlock}>
                  <ThemedText style={styles.statLabel}>Patients</ThemedText>
                  <View style={styles.statValueRow}>
                    <ThemedText style={styles.statValue}>{filteredPatients.length}</ThemedText>
                    <ThemedText style={styles.statChange}>{filteredPatients.length > 0 ? `+${Math.min(5, filteredPatients.length)}` : '0'}</ThemedText>
                  </View>
                  <ProgressBar progress={filteredPatients.length / 100} color="#4CAF50" style={styles.progressBar} />
                </View>
                
                <View style={styles.mainStatBlock}>
                  <ThemedText style={styles.statLabel}>Appointments</ThemedText>
                  <View style={styles.statValueRow}>
                    <ThemedText style={styles.statValue}>{filteredAppointments.length}</ThemedText>
                    <ThemedText style={styles.statChange}>{filteredAppointments.length > 0 ? `+${Math.min(2, filteredAppointments.length)}` : '0'}</ThemedText>
                  </View>
                  <ProgressBar progress={filteredAppointments.length / 100} color="#2196F3" style={styles.progressBar} />
                </View>
              </View>

              <Divider style={styles.statsDivider} />
              
              {/* Additional Stats */}
              <View style={styles.additionalStatsContainer}>
                <View style={styles.statsRow}>
                  <View style={styles.statColumnBlock}>
                    <ThemedText style={styles.smallStatLabel}>Completion Rate</ThemedText>
                    <View style={styles.statsIndicator}>
                      <ThemedText style={styles.smallStatValue}>
                        {filteredAppointments.length > 0 
                          ? Math.round((completedAppointments / filteredAppointments.length) * 100) 
                          : 0}%
                      </ThemedText>
                      <View style={styles.indicatorBar}>
                        <View 
                          style={[
                            styles.indicatorFill, 
                            { 
                              width: `${filteredAppointments.length > 0 
                                ? Math.round((completedAppointments / filteredAppointments.length) * 100) 
                                : 0}%`,
                              backgroundColor: '#00C853'
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.statColumnBlock}>
                    <ThemedText style={styles.smallStatLabel}>Cancellation Rate</ThemedText>
                    <View style={styles.statsIndicator}>
                      <ThemedText style={styles.smallStatValue}>
                        {filteredAppointments.length > 0 
                          ? Math.round((filteredAppointments.filter(a => a.status === 'cancelled').length / filteredAppointments.length) * 100) 
                          : 0}%
                      </ThemedText>
                      <View style={styles.indicatorBar}>
                        <View 
                          style={[
                            styles.indicatorFill, 
                            { 
                              width: `${filteredAppointments.length > 0 
                                ? Math.round((filteredAppointments.filter(a => a.status === 'cancelled').length / filteredAppointments.length) * 100) 
                                : 0}%`,
                              backgroundColor: '#F44336'
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statColumnBlock}>
                    <ThemedText style={styles.smallStatLabel}>New vs. Returning</ThemedText>
                    <View style={styles.doubleIndicator}>
                      <View style={styles.doubleIndicatorRow}>
                        <View style={[styles.indicatorDot, { backgroundColor: '#4CAF50' }]} />
                        <ThemedText style={styles.indicatorLabel}>New</ThemedText>
                        <ThemedText style={styles.indicatorValue}>
                          {Math.round(filteredAppointments.length * 0.3)}
                        </ThemedText>
                      </View>
                      <View style={styles.doubleIndicatorRow}>
                        <View style={[styles.indicatorDot, { backgroundColor: '#2196F3' }]} />
                        <ThemedText style={styles.indicatorLabel}>Returning</ThemedText>
                        <ThemedText style={styles.indicatorValue}>
                          {Math.round(filteredAppointments.length * 0.7)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statColumnBlock}>
                    <ThemedText style={styles.smallStatLabel}>Avg. Revenue/Visit</ThemedText>
                    <View style={styles.statsIndicator}>
                      <ThemedText style={styles.revenueValue}>
                        ${((completedAppointments * 175) / (completedAppointments || 1)).toFixed(0)}
                      </ThemedText>
                      <ThemedText style={styles.periodLabel}>per visit</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </Card.Content>
          </TouchableRipple>
        </Surface>
        
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        </View>

        <View style={styles.quickActions}>
          <TouchableRipple 
            style={styles.actionButton} 
            onPress={() => router.push('/register')}
            rippleColor="rgba(0, 0, 0, 0.1)"
          >
            <View>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <FontAwesome5 name="user-plus" size={18} color="#4CAF50" />
              </View>
              <ThemedText style={styles.actionText}>Add Patient</ThemedText>
            </View>
          </TouchableRipple>
          
          <TouchableRipple 
            style={styles.actionButton} 
            onPress={() => router.push('/(tabs)/appointments')}
            rippleColor="rgba(0, 0, 0, 0.1)"
          >
            <View>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <FontAwesome5 name="calendar-plus" size={18} color="#4CAF50" />
          </View>
              <ThemedText style={styles.actionText}>Schedule</ThemedText>
            </View>
          </TouchableRipple>
          
          <TouchableRipple 
            style={styles.actionButton} 
            onPress={() => router.push('/(tabs)/explore')}
            rippleColor="rgba(0, 0, 0, 0.1)"
          >
            <View>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <FontAwesome5 name="search" size={18} color="#4CAF50" />
          </View>
              <ThemedText style={styles.actionText}>Search</ThemedText>
            </View>
          </TouchableRipple>
          
          <TouchableRipple 
            style={styles.actionButton} 
            onPress={() => router.push('/settings')}
            rippleColor="rgba(0, 0, 0, 0.1)"
          >
            <View>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <FontAwesome5 name="cog" size={18} color="#4CAF50" />
              </View>
              <ThemedText style={styles.actionText}>Settings</ThemedText>
          </View>
          </TouchableRipple>
        </View>
      </ScrollView>
      
      {/* Completion Dialog */}
      <Dialog visible={completionDialogVisible} onDismiss={() => setCompletionDialogVisible(false)} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          <FontAwesome5 name="check-circle" size={16} color="#4CAF50" style={{marginRight: 6}} />
          Mark Appointment as Completed
        </Dialog.Title>
        <Dialog.Content>
          <ThemedText style={styles.dialogText}>
            Are you sure you want to mark this appointment as completed?
          </ThemedText>
          <TextInput
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
          <Button onPress={() => setCompletionDialogVisible(false)} textColor="#757575" labelStyle={{fontSize: 13}}>No</Button>
          <Button 
            onPress={handleCompleteAppointment} 
            mode="contained" 
            buttonColor="#4CAF50"
            style={{borderRadius: 8}}
            labelStyle={{fontSize: 13}}
          >
            Yes, Complete
          </Button>
        </Dialog.Actions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          <FontAwesome5 name="calendar-check" size={16} color="#4CAF50" style={{marginRight: 6}} />
          Confirm Appointment
        </Dialog.Title>
        <Dialog.Content>
          <ThemedText style={styles.dialogText}>
            Are you sure you want to confirm this pending appointment?
          </ThemedText>
        </Dialog.Content>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => setConfirmDialogVisible(false)} textColor="#757575" labelStyle={{fontSize: 13}}>No</Button>
          <Button 
            onPress={handleConfirmAppointment} 
            mode="contained" 
            buttonColor="#4CAF50"
            style={{borderRadius: 8}}
            labelStyle={{fontSize: 13}}
          >
            Yes, Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
      
      {/* Cancel Dialog */}
      <Dialog visible={cancelDialogVisible} onDismiss={() => setCancelDialogVisible(false)} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          <FontAwesome5 name="calendar-times" size={16} color="#F44336" style={{marginRight: 6}} />
          Cancel Appointment
        </Dialog.Title>
        <Dialog.Content>
          <ThemedText style={styles.dialogText}>
            Are you sure you want to cancel this appointment?
          </ThemedText>
        </Dialog.Content>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => setCancelDialogVisible(false)} textColor="#757575" labelStyle={{fontSize: 13}}>No</Button>
          <Button 
            mode="contained"
            buttonColor="#F44336" 
            onPress={handleCancelAppointment}
            style={{borderRadius: 8}}
            labelStyle={{fontSize: 13}}
          >
            Yes, Cancel
          </Button>
        </Dialog.Actions>
      </Dialog>
      </ThemedView>
  );
}

// Stat Card Component
function StatCard({ value, label, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
          <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <View>
          <ThemedText style={styles.statNumber}>{value}</ThemedText>
          <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </View>
      </View>
    </View>
  );
}

// Define styles with static color values, not dependent on theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsSurface: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  widgetSurface: {
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appointmentItem: {
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  appointmentItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  appointmentReason: {
    fontSize: 14,
    marginTop: 4,
  },
  appointmentDivider: {
    marginVertical: 8,
    backgroundColor: '#EEEEEE',
    height: 1,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 16,
    color: '#9E9E9E',
    fontSize: 16,
  },
  scheduleEmptyButton: {
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  statsCard: {
    marginBottom: 20,
    borderRadius: 16,
  },
  statsContent: {
    padding: 16,
  },
  statsMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainStatBlock: {
    width: '48%',
  },
  statsDivider: {
    marginVertical: 16,
    backgroundColor: '#E0E0E0',
  },
  additionalStatsContainer: {
    marginTop: 4,
  },
  statColumnBlock: {
    width: '48%',
  },
  smallStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  smallStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsIndicator: {
    marginTop: 4,
  },
  indicatorBar: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
    borderRadius: 3,
  },
  doubleIndicator: {
    marginTop: 4,
  },
  doubleIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorLabel: {
    fontSize: 12,
    color: '#757575',
    flex: 1,
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  periodLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statChange: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 0,
    padding: 16,
  },
  actionButton: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    textAlign: 'center',
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
  menu: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
  },
  menuButton: {
    margin: 0,
    marginLeft: 8,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    padding: 8,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  dialogActions: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  statPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  appointmentsContainer: {
    padding: 0,
    minHeight: 250, // Fixed minimum height to accommodate approximately 3 items
  },
  appointmentsScrollView: {
    maxHeight: 250, // Limit height to show ~3 items
    paddingHorizontal: 16,
  },
  appointmentsScrollContent: {
    paddingVertical: 8,
  },
  appointmentItemContainer: {
    marginBottom: 8,
  },
  emptySubText: {
    color: '#757575',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  emptyButton: {
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
});
