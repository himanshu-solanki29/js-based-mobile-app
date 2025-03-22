import { Platform, PermissionsAndroid } from 'react-native';

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
    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    ];
    
    // Request both permissions together
    const granted = await PermissionsAndroid.requestMultiple(permissions);
    
    // Check if both permissions were granted
    return (
      granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
    );
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

  try {
    const readPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    
    const writePermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    
    return readPermission && writePermission;
  } catch (error) {
    console.error('Error checking storage permissions:', error);
    return false;
  }
}; 