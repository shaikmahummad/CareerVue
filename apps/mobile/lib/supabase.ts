import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const secureStorage = {
  async getItem(key: string) {
    const secured = await SecureStore.getItemAsync(key);
    if (secured !== null) return secured;

    // One-time migration preserves sessions created by earlier app versions.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await SecureStore.setItemAsync(key, legacy, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  },
};

// SecureStore is native-only; AsyncStorage is retained solely for Expo web.
const authStorage = Platform.OS === "web" ? AsyncStorage : secureStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            authStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
