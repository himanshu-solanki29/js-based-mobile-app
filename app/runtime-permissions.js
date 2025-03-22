import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Request storage permissions for Android
 * This is needed for Android 6.0+ (API level 23+)
 * @returns {Promise<boolean>} True if permissions are granted
 */
export const requestStoragePermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Android 10+ doesn't need these permissions for app-specific storage
    if (Platform.Version >= 29) {
      console.log('Android 10+ uses scoped storage, no permissions needed');
      return true;
    }

    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    ];
    
    // Request both permissions together
    const granted = await PermissionsAndroid.requestMultiple(permissions);
    
    // Check if both permissions were granted
    const allGranted = (
      granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
    );
    
    if (!allGranted) {
      console.log('Storage permissions were denied:', granted);
    }
    
    return allGranted;
  } catch (error) {
    console.error('Error requesting storage permissions:', error);
    return false;
  }
};

/**
 * Check if storage permissions are granted
 * @returns {Promise<boolean>} True if permissions are granted
 */
export const checkStoragePermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  // Android 10+ doesn't need these permissions for app-specific storage
  if (Platform.Version >= 29) {
    console.log('Android 10+ uses scoped storage, no permissions needed');
    return true;
  }

  try {
    const readPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    
    const writePermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    
    const hasPermissions = readPermission && writePermission;
    if (!hasPermissions) {
      console.log('Storage permissions not granted. Read:', readPermission, 'Write:', writePermission);
    }
    
    return hasPermissions;
  } catch (error) {
    console.error('Error checking storage permissions:', error);
    return false;
  }
};

/**
 * Get a default export to avoid React Native warnings
 * This is a workaround for the "missing the required default export" warning
 */
export default {
  requestStoragePermissions,
  checkStoragePermissions
}; 