import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const STORAGE_KEY = 'etcafe.biometricEnabled';

export async function isBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function getBiometricEnabled() {
  return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
}

export async function setBiometricEnabled(enabled) {
  if (enabled) {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export async function authenticateBiometric(promptMessage = 'Confirm to continue') {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}
