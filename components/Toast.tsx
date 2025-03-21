import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Snackbar, useTheme } from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
  type?: ToastType;
  position?: 'bottom' | 'top';
}

const TOAST_COLORS = {
  success: {
    background: '#E8F5E9',
    text: '#2E7D32',
    icon: 'check-circle'
  },
  error: {
    background: '#FFEBEE',
    text: '#C62828',
    icon: 'times-circle'
  },
  info: {
    background: '#E3F2FD',
    text: '#0D47A1',
    icon: 'info-circle'
  },
  warning: {
    background: '#FFF3E0',
    text: '#E65100',
    icon: 'exclamation-circle'
  }
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  onDismiss,
  duration = 3000,
  type = 'info',
  position = 'bottom'
}) => {
  const theme = useTheme();
  const [localVisible, setLocalVisible] = useState(visible);
  
  useEffect(() => {
    setLocalVisible(visible);
  }, [visible]);

  // Auto-dismiss after duration
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  const colors = TOAST_COLORS[type];
  
  return (
    <Snackbar
      visible={localVisible}
      onDismiss={onDismiss}
      duration={duration}
      style={[
        styles.snackbar, 
        position === 'top' ? styles.topSnackbar : styles.bottomSnackbar,
        { backgroundColor: colors.background }
      ]}
      wrapperStyle={[
        styles.wrapper,
        position === 'top' ? styles.topWrapper : styles.bottomWrapper
      ]}
      action={{
        label: 'Dismiss',
        textColor: colors.text,
        onPress: onDismiss,
      }}
    >
      <View style={styles.contentContainer}>
        <FontAwesome5 
          name={colors.icon} 
          size={16} 
          color={colors.text} 
          style={styles.icon} 
        />
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            {message}
          </Text>
        </View>
      </View>
    </Snackbar>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 1000,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topWrapper: {
    top: 50,
  },
  bottomWrapper: {
    bottom: 0,
  },
  snackbar: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topSnackbar: {
    marginTop: 50,
  },
  bottomSnackbar: {
    marginBottom: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  messageContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
  }
});

// Utility function to show a toast from anywhere in the app
export const useToast = () => {
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

  const toastComponent = (
    <Toast
      visible={visible}
      message={message}
      type={toastType}
      duration={duration}
      onDismiss={hideToast}
    />
  );

  return {
    showToast,
    hideToast,
    toastComponent
  };
}; 