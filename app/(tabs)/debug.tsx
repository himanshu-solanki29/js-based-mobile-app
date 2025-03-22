import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Surface, Button, Divider, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { requestStoragePermissions, checkStoragePermissions } from '@/app/runtime-permissions';
import { Colors } from '@/constants/Colors';

// Define types for logs
type LogEntry = {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'warning' | 'success';
  message: string;
  details?: any;
};

const DEBUG_LOGS_KEY = 'debug_logs';

export default function DebugScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storagePermissionsGranted, setStoragePermissionsGranted] = useState<boolean | null>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Initialize
  useEffect(() => {
    loadLogs();
    checkPermissions();

    // Set up interval for auto refresh
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        loadLogs();
        checkPermissions();
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  // Check Android storage permissions
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const hasPermissions = await checkStoragePermissions();
      setStoragePermissionsGranted(hasPermissions);
      logInfo('Storage permissions check', { granted: hasPermissions });
    } else {
      setStoragePermissionsGranted(true);
    }
  };

  // Request Android storage permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await requestStoragePermissions();
      setStoragePermissionsGranted(granted);
      if (granted) {
        logSuccess('Storage permissions granted');
      } else {
        logError('Failed to get storage permissions');
      }
    }
  };

  // Load debug logs from storage
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const logsData = await AsyncStorage.getItem(DEBUG_LOGS_KEY);
      if (logsData) {
        const parsedLogs = JSON.parse(logsData);
        setLogs(parsedLogs);
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save logs to storage
  const saveLogs = async (updatedLogs: LogEntry[]) => {
    try {
      await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to save debug logs:', error);
    }
  };

  // Add a new log entry
  const addLogEntry = async (type: 'info' | 'error' | 'warning' | 'success', message: string, details?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep only last 100 logs
    setLogs(updatedLogs);
    await saveLogs(updatedLogs);
    return newLog;
  };

  // Log helper functions
  const logInfo = (message: string, details?: any) => addLogEntry('info', message, details);
  const logError = (message: string, details?: any) => addLogEntry('error', message, details);
  const logWarning = (message: string, details?: any) => addLogEntry('warning', message, details);
  const logSuccess = (message: string, details?: any) => addLogEntry('success', message, details);

  // Clear all logs
  const clearLogs = async () => {
    setLogs([]);
    await AsyncStorage.removeItem(DEBUG_LOGS_KEY);
    logInfo('All logs cleared');
  };

  // Test storage operations
  const testStorage = async () => {
    setIsTestingStorage(true);
    try {
      // Test AsyncStorage
      const testKey = 'debug_test_key';
      const testValue = { test: 'value', timestamp: Date.now() };
      
      logInfo('Starting storage test', { platform: Platform.OS });
      
      // Test write
      await AsyncStorage.setItem(testKey, JSON.stringify(testValue));
      logSuccess('AsyncStorage write successful');
      
      // Test read
      const readValue = await AsyncStorage.getItem(testKey);
      if (readValue) {
        const parsedValue = JSON.parse(readValue);
        logSuccess('AsyncStorage read successful', parsedValue);
      } else {
        logError('AsyncStorage read failed - value not found');
      }
      
      // Test delete
      await AsyncStorage.removeItem(testKey);
      logSuccess('AsyncStorage delete successful');
      
      // Test FileSystem if on mobile
      if (Platform.OS !== 'web') {
        const fileName = `debug_test_${Date.now()}.txt`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        
        // Test file write
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(testValue));
        logSuccess('FileSystem write successful', { path: filePath });
        
        // Test file read
        const fileContent = await FileSystem.readAsStringAsync(filePath);
        logSuccess('FileSystem read successful', { content: fileContent.substring(0, 50) + '...' });
        
        // Test file delete
        await FileSystem.deleteAsync(filePath);
        logSuccess('FileSystem delete successful');
      }
      
    } catch (error: any) {
      logError('Storage test failed', { message: error.message, stack: error.stack });
    } finally {
      setIsTestingStorage(false);
    }
  };

  // Get storage information
  const getStorageInfo = async () => {
    try {
      setIsRunningDiagnostics(true);
      
      const info: any = {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      };
      
      // Get AsyncStorage keys
      if (Platform.OS === 'web') {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keys.push(key);
        }
        info.asyncStorage = { keys };
      } else {
        const keys = await AsyncStorage.getAllKeys();
        info.asyncStorage = { 
          keys,
          keyCount: keys.length
        };
      }
      
      // Get file system info if on mobile
      if (Platform.OS !== 'web') {
        // Check document directory
        const docDirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
        
        // Check cache directory
        const cacheDirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory!);
        
        info.fileSystem = {
          documentDirectory: {
            path: FileSystem.documentDirectory,
            exists: docDirInfo.exists,
            isDirectory: docDirInfo.isDirectory
          },
          cacheDirectory: {
            path: FileSystem.cacheDirectory,
            exists: cacheDirInfo.exists,
            isDirectory: cacheDirInfo.isDirectory
          }
        };
        
        // Try to list files in document directory
        try {
          const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
          info.fileSystem.documentDirectory.files = files;
        } catch (error: any) {
          info.fileSystem.documentDirectory.error = error.message;
        }
      }
      
      // Set the gathered info
      setStorageInfo(info);
      logInfo('Storage diagnostics complete', info);
    } catch (error: any) {
      logError('Error getting storage info', { message: error.message });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get icon name based on log type
  const getLogIcon = (type: string) => {
    switch(type) {
      case 'info': return 'info-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      case 'success': return 'check-circle';
      default: return 'info-circle';
    }
  };

  // Get color based on log type
  const getLogColor = (type: string) => {
    switch(type) {
      case 'info': return '#2196F3';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'success': return '#4CAF50';
      default: return '#2196F3';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Android Debug</ThemedText>
        <View style={styles.headerButtons}>
          <IconButton
            icon="refresh"
            size={20}
            onPress={loadLogs}
            iconColor={Colors.light.tint}
          />
          <IconButton
            icon={autoRefresh ? "sync" : "sync-off"}
            size={20}
            onPress={() => setAutoRefresh(!autoRefresh)}
            iconColor={autoRefresh ? Colors.light.tint : '#757575'}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Permissions Section */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>Storage Permissions</ThemedText>
          
          <View style={styles.permissionStatus}>
            <FontAwesome5 
              name={storagePermissionsGranted ? "check-circle" : "times-circle"} 
              size={24} 
              color={storagePermissionsGranted ? "#4CAF50" : "#F44336"} 
              style={styles.statusIcon} 
            />
            <ThemedText style={styles.permissionText}>
              {storagePermissionsGranted === null 
                ? "Checking permissions..." 
                : storagePermissionsGranted 
                  ? "Storage permissions granted" 
                  : "Storage permissions denied"}
            </ThemedText>
          </View>
          
          {Platform.OS === 'android' && !storagePermissionsGranted && (
            <Button 
              mode="contained" 
              onPress={requestPermissions}
              style={styles.actionButton}
              buttonColor="#4CAF50"
            >
              Request Permissions
            </Button>
          )}
        </Surface>

        {/* Diagnostics Section */}
        <Surface style={styles.section} elevation={1}>
          <ThemedText style={styles.sectionTitle}>Diagnostics</ThemedText>
          
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined" 
              onPress={testStorage}
              style={styles.actionButton}
              loading={isTestingStorage}
              disabled={isTestingStorage}
            >
              Test Storage
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={getStorageInfo}
              style={styles.actionButton}
              loading={isRunningDiagnostics}
              disabled={isRunningDiagnostics}
            >
              Get Storage Info
            </Button>
          </View>
          
          {storageInfo && (
            <Card style={styles.infoCard}>
              <Card.Title title="Storage Diagnostics" />
              <Card.Content>
                <ThemedText style={styles.infoText}>Platform: {storageInfo.platform}</ThemedText>
                <ThemedText style={styles.infoText}>AsyncStorage Keys: {storageInfo.asyncStorage?.keyCount || 'N/A'}</ThemedText>
                
                {storageInfo.fileSystem && (
                  <>
                    <ThemedText style={styles.infoSubtitle}>File System:</ThemedText>
                    <ThemedText style={styles.infoText}>
                      Document Dir: {storageInfo.fileSystem.documentDirectory.exists ? 'Exists' : 'Not Found'}
                    </ThemedText>
                    {storageInfo.fileSystem.documentDirectory.files && (
                      <ThemedText style={styles.infoText}>
                        Files: {storageInfo.fileSystem.documentDirectory.files.length}
                      </ThemedText>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          )}
        </Surface>

        {/* Logs Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Storage Logs</ThemedText>
            <Button 
              mode="text" 
              onPress={clearLogs}
              disabled={logs.length === 0}
              textColor="#F44336"
            >
              Clear
            </Button>
          </View>
          
          {isLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyLogs}>
              <FontAwesome5 name="clipboard" size={24} color="#CCCCCC" style={styles.emptyIcon} />
              <ThemedText style={styles.emptyText}>No logs available</ThemedText>
            </View>
          ) : (
            <View style={styles.logsList}>
              {logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <View style={styles.logTypeContainer}>
                      <FontAwesome5 
                        name={getLogIcon(log.type)} 
                        size={16} 
                        color={getLogColor(log.type)} 
                        style={styles.logIcon} 
                      />
                      <ThemedText style={[styles.logType, { color: getLogColor(log.type) }]}>
                        {log.type.toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.logTime}>{formatTimestamp(log.timestamp)}</ThemedText>
                  </View>
                  
                  <ThemedText style={styles.logMessage}>{log.message}</ThemedText>
                  
                  {log.details && (
                    <View style={styles.logDetails}>
                      <ThemedText style={styles.logDetailsText}>
                        {typeof log.details === 'string' 
                          ? log.details 
                          : JSON.stringify(log.details, null, 2)}
                      </ThemedText>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#424242',
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusIcon: {
    marginRight: 12,
  },
  permissionText: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    margin: 8,
    borderRadius: 8,
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  logsList: {
    padding: 8,
  },
  logItem: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: 6,
  },
  logType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTime: {
    fontSize: 12,
    color: '#757575',
  },
  logMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  logDetails: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  logDetailsText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyLogs: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#757575',
  },
  loading: {
    padding: 24,
  },
}); 