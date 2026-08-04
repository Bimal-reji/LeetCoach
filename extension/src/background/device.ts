/**
 * Device identity — a stable random UUID stored once in chrome.storage.local.
 * Sent as `X-Device-Id` to the backend (auth-free v1; Firebase slots in later).
 */
import { STORAGE_KEYS } from "../shared/constants";

export async function ensureDeviceId(): Promise<string> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.deviceId);
  let id = data[STORAGE_KEYS.deviceId] as string | undefined;
  if (!id) {
    id = crypto.randomUUID();
    await chrome.storage.local.set({ [STORAGE_KEYS.deviceId]: id });
  }
  return id;
}

export async function getDeviceId(): Promise<string> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.deviceId);
  return (data[STORAGE_KEYS.deviceId] as string) || (await ensureDeviceId());
}
