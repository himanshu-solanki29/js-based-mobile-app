import { StyleSheet, View, TouchableOpacity, ScrollView, FlatList } from "react-native";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useEffect, useState } from "react";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useRouter } from "expo-router";
import { formatDate } from "@/utils/dateFormat";
import { MOCK_APPOINTMENTS, AppointmentStatus, sortAppointmentsByDateDesc } from "../../utils/appointmentStore";
import { Card, Badge, Button, Avatar, Surface, Title, Divider, ProgressBar, useTheme, IconButton, Menu, Dialog, TextInput } from 'react-native-paper';
import { usePatients } from '@/utils/patientStore';

// Function to get upcoming appointments (both confirmed and pending)
const getUpcomingAppointments = () => {
  // Get all confirmed and pending appointments
  const relevantAppointments = MOCK_APPOINTMENTS.filter(
    (appointment) => appointment.status === 'confirmed' || appointment.status === 'pending'
  );
  
  // Sort by date and time (most recent first)
  const sortedAppointments = sortAppointmentsByDateDesc(relevantAppointments);
  
  // Take up to the next 4 appointments
  return sortedAppointments.slice(0, 4);
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { patientsArray } = usePatients();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [weekAppointments, setWeekAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  
  // For appointment actions
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completionDialogVisible, setCompletionDialogVisible] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  
  // Calculate dashboard statistics
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const todayCount = MOCK_APPOINTMENTS.filter(a => a.date === today).length;
    const weekCount = MOCK_APPOINTMENTS.filter(a => a.date >= weekStartStr).length;
    const pendingCount = MOCK_APPOINTMENTS.filter(a => a.status === 'pending').length;
    const completedCount = MOCK_APPOINTMENTS.filter(a => a.status === 'completed').length;
    
    setTodayAppointments(todayCount);
    setWeekAppointments(weekCount);
    setPendingAppointments(pendingCount);
    setCompletedAppointments(completedCount);
    setUpcomingAppointments(getUpcomingAppointments());
  }, []);
  
  // Handle marking appointment as completed
  const handleCompleteAppointment = () => {
    if (!selectedAppointment) return;
    
    // Find the appointment in the mock data
    const index = MOCK_APPOINTMENTS.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1) {
      // Update the status
      MOCK_APPOINTMENTS[index].status = 'completed';
      // Add remarks if provided
      if (completionRemarks) {
        MOCK_APPOINTMENTS[index].notes = completionRemarks;
      }
      
      // Update the displayed appointments
      setUpcomingAppointments(getUpcomingAppointments());
      
      // Update statistics
      const completedCount = MOCK_APPOINTMENTS.filter(a => a.status === 'completed').length;
      setCompletedAppointments(completedCount);
      
      // Decrease pending if it was pending
      if (selectedAppointment.status === 'pending') {
        const pendingCount = MOCK_APPOINTMENTS.filter(a => a.status === 'pending').length;
        setPendingAppointments(pendingCount);
      }
      
      // Reset state
      setCompletionDialogVisible(false);
      setCompletionRemarks('');
      setSelectedAppointment(null);
    }
  };
  
  // Handle confirming a pending appointment
  const handleConfirmAppointment = () => {
    if (!selectedAppointment) return;
    
    // Find the appointment in the mock data
    const index = MOCK_APPOINTMENTS.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1 && MOCK_APPOINTMENTS[index].status === 'pending') {
      // Update the status
      MOCK_APPOINTMENTS[index].status = 'confirmed';
      
      // Update the displayed appointments
      setUpcomingAppointments(getUpcomingAppointments());
      
      // Update statistics
      const pendingCount = MOCK_APPOINTMENTS.filter(a => a.status === 'pending').length;
      setPendingAppointments(pendingCount);
      
      // Reset state
      setConfirmDialogVisible(false);
      setSelectedAppointment(null);
    }
  };
  
  // Handle cancelling an appointment
  const handleCancelAppointment = () => {
    if (!selectedAppointment) return;
    
    // Find the appointment in the mock data
    const index = MOCK_APPOINTMENTS.findIndex(a => a.id === selectedAppointment.id);
    if (index !== -1 && MOCK_APPOINTMENTS[index].status === 'pending') {
      // Update the status
      MOCK_APPOINTMENTS[index].status = 'cancelled';
      
      // Update the displayed appointments
      setUpcomingAppointments(getUpcomingAppointments());
      
      // Update statistics
      const pendingCount = MOCK_APPOINTMENTS.filter(a => a.status === 'pending').length;
      setPendingAppointments(pendingCount);
      
      // Reset state
      setCancelDialogVisible(false);
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
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.welcomeText}>Welcome back</ThemedText>
            <ThemedText style={styles.title}>Dashboard</ThemedText>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/settings')}>
            <FontAwesome5 name="user-circle" size={32} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        <Surface style={styles.statsSurface} elevation={1}>
          <View style={styles.statsRow}>
            <StatCard 
              value={patientsArray.length.toString()} 
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
        </Surface>
        
        {/* Upcoming Appointments Widget */}
        <Surface style={styles.widgetSurface} elevation={1}>
          <View style={styles.widgetHeader}>
            <ThemedText style={styles.widgetTitle}>Upcoming Appointments</ThemedText>
            <Button 
              mode="text" 
              onPress={() => router.push('/(tabs)/appointments')}
              labelStyle={styles.seeAllText}
              compact
            >
              See All
            </Button>
          </View>
          
          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyContent}>
              <FontAwesome5 name="calendar-check" size={32} color="#CCCCCC" />
              <ThemedText style={styles.emptyText}>No upcoming appointments</ThemedText>
              <Button 
                mode="outlined" 
                onPress={() => router.push('/(tabs)/appointments')}
                style={styles.scheduleEmptyButton}
                textColor="#4CAF50"
              >
                Schedule Now
              </Button>
            </View>
          ) : (
            upcomingAppointments.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <Divider style={styles.appointmentDivider} />}
                <View style={styles.appointmentItem}>
                  <View style={styles.appointmentRow}>
                    <View style={[
                      styles.dateBox, 
                      item.status === 'pending' ? styles.pendingDateBox : {}
                    ]}>
                      <ThemedText style={[
                        styles.dateDay,
                        item.status === 'pending' ? styles.pendingDateText : {}
                      ]}>
                        {new Date(item.date).getDate()}
                      </ThemedText>
                      <ThemedText style={[
                        styles.dateMonth,
                        item.status === 'pending' ? styles.pendingDateText : {}
                      ]}>
                        {new Date(item.date).toLocaleString('default', { month: 'short' })}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.appointmentDetails}>
                      <View style={styles.appointmentHeader}>
                        <ThemedText style={styles.patientName}>{item.patientName}</ThemedText>
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
                        <FontAwesome5 name="clock" size={12} color={item.status === 'pending' ? "#FF9800" : "#4CAF50"} /> {item.time}
                      </ThemedText>
                      <ThemedText style={styles.reasonText}>{item.reason}</ThemedText>
                    </View>
                    
                    {renderAppointmentMenu(item)}
                  </View>
                </View>
              </View>
            ))
          )}
        </Surface>
        
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Stats Overview</ThemedText>
        </View>
        
        <Surface style={styles.widgetSurface} elevation={1}>
          <Card.Content style={styles.statsContent}>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <ThemedText style={styles.statPercentage}>{Math.round((pendingAppointments/MOCK_APPOINTMENTS.length)*100)}%</ThemedText>
                <ThemedText style={styles.statLabel}>Pending</ThemedText>
                <ProgressBar progress={pendingAppointments/MOCK_APPOINTMENTS.length} color="#FF9800" style={styles.progressBar} />
              </View>
              <View style={styles.statBlock}>
                <ThemedText style={styles.statPercentage}>{Math.round((completedAppointments/MOCK_APPOINTMENTS.length)*100)}%</ThemedText>
                <ThemedText style={styles.statLabel}>Completed</ThemedText>
                <ProgressBar progress={completedAppointments/MOCK_APPOINTMENTS.length} color="#4CAF50" style={styles.progressBar} />
              </View>
            </View>
          </Card.Content>
        </Surface>
        
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/register')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome5 name="user-plus" size={18} color="#4CAF50" />
            </View>
            <ThemedText style={styles.actionText}>Add Patient</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/(tabs)/appointments')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome5 name="calendar-plus" size={18} color="#4CAF50" />
            </View>
            <ThemedText style={styles.actionText}>Schedule</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/(tabs)/explore')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome5 name="search" size={18} color="#4CAF50" />
            </View>
            <ThemedText style={styles.actionText}>Search</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome5 name="cog" size={18} color="#4CAF50" />
            </View>
            <ThemedText style={styles.actionText}>Settings</ThemedText>
          </TouchableOpacity>
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
    padding: 4,
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appointmentItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  appointmentHeader: {
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
  appointmentDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: '#EEEEEE',
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
  statBlock: {
    width: '48%',
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
});
