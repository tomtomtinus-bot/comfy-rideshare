import { Capacitor } from "@capacitor/core";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";

const SERVER = "viacust.app";

export const isNative = () => Capacitor.isNativePlatform();

export async function biometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const r = await NativeBiometric.isAvailable();
    return r.isAvailable && r.biometryType !== BiometryType.NONE;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(email: string, password: string) {
  await NativeBiometric.setCredentials({ username: email, password, server: SERVER });
}

export async function clearBiometricCredentials() {
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch {
    // ignore
  }
}

export async function hasStoredCredentials(): Promise<boolean> {
  try {
    const c = await NativeBiometric.getCredentials({ server: SERVER });
    return !!c?.username;
  } catch {
    return false;
  }
}

export async function unlockWithBiometrics(): Promise<{ email: string; password: string } | null> {
  if (!(await biometricAvailable())) return null;
  try {
    await NativeBiometric.verifyIdentity({
      reason: "Inloggen bij ViaCust",
      title: "Biometrische authenticatie",
      subtitle: "Gebruik je vingerafdruk of gezicht",
      description: "Ontgrendel je ViaCust-account",
    });
    const c = await NativeBiometric.getCredentials({ server: SERVER });
    if (!c?.username || !c?.password) return null;
    return { email: c.username, password: c.password };
  } catch {
    return null;
  }
}
