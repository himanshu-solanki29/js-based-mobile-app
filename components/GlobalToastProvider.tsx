import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Toast, ToastType } from './Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useGlobalToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast must be used within a GlobalToastProvider');
  }
  return context;
};

interface GlobalToastProviderProps {
  children: ReactNode;
}

export const GlobalToastProvider: React.FC<GlobalToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(3000);

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    setMessage(message);
    setToastType(type);
    setDuration(duration);
    setVisible(true);
  };

  const hideToast = () => {
    setVisible(false);
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      <View style={styles.container}>
        {children}
        <Toast
          visible={visible}
          message={message}
          type={toastType}
          duration={duration}
          onDismiss={hideToast}
          position="top"
        />
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 