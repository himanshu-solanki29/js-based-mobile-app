import StorageService from './storageService';

// Storage key
const LOG_STORAGE_KEY = 'operation_logs';

// Log entry type definition
export type LogEntry = {
  id: string;
  timestamp: string;
  operation: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details: string;
};

// Log storage service
class LogStorageService extends StorageService<LogEntry[]> {
  private logs: LogEntry[] = [];
  
  constructor() {
    super(LOG_STORAGE_KEY);
    this.loadLogs().catch(err => {
      console.error('Failed to load logs:', err);
    });
  }
  
  async loadLogs() {
    const storedLogs = await this.getData();
    this.logs = storedLogs || [];
  }
  
  async getLogs(): Promise<LogEntry[]> {
    if (this.logs.length === 0) {
      await this.loadLogs();
    }
    return [...this.logs];
  }
  
  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    // Create a new log entry with id and timestamp
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    // Add to local logs
    this.logs = [newLog, ...this.logs].slice(0, 100); // Keep only last 100 logs
    
    // Save to storage
    await this.saveData(this.logs);
  }
  
  async clearLogs(): Promise<void> {
    this.logs = [];
    await this.saveData(this.logs);
  }
}

// Create an instance of the log service
const logStorageService = new LogStorageService();
export default logStorageService; 