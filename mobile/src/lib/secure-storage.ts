import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Storage for the Supabase session (access and refresh tokens). On phones it lives in the Keychain
// (iOS) or Keystore-encrypted storage (Android), never in plain files. SecureStore refuses values over
// about 2 KB and a session can be larger, so each value is split into chunks under that size with a
// count kept under the key itself. On web (the development preview) it falls back to localStorage.

const CHUNK_SIZE = 1800;
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

// SecureStore keys allow only letters, numbers, ".", "-" and "_".
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

function chunkKey(key: string, index: number): string {
  return `${safeKey(key)}.${index}`;
}

async function removeChunks(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(`${safeKey(key)}.count`, options));
  const deletes: Promise<void>[] = [SecureStore.deleteItemAsync(`${safeKey(key)}.count`, options)];
  for (let index = 0; index < (Number.isInteger(count) ? count : 0); index += 1) {
    deletes.push(SecureStore.deleteItemAsync(chunkKey(key, index), options));
  }
  await Promise.all(deletes);
}

export const secureStorage = Platform.OS === "web"
  ? {
      getItem: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
      setItem: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
      removeItem: async (key: string) => globalThis.localStorage?.removeItem(key),
    }
  : {
      async getItem(key: string): Promise<string | null> {
        const count = Number(await SecureStore.getItemAsync(`${safeKey(key)}.count`, options));
        if (!Number.isInteger(count) || count <= 0) return null;
        const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index), options)));
        // A missing chunk means a write was cut off; treat the value as gone rather than return half of it.
        if (chunks.some((chunk) => chunk === null)) return null;
        return chunks.join("");
      },
      async setItem(key: string, value: string): Promise<void> {
        await removeChunks(key);
        const chunks: string[] = [];
        for (let start = 0; start < value.length; start += CHUNK_SIZE) chunks.push(value.slice(start, start + CHUNK_SIZE));
        await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk, options)));
        // The count goes last, so a value is only readable once every chunk is written.
        await SecureStore.setItemAsync(`${safeKey(key)}.count`, String(chunks.length), options);
      },
      async removeItem(key: string): Promise<void> {
        await removeChunks(key);
      },
    };
