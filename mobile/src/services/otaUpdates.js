import * as Updates from 'expo-updates';

// Silently checks for a JS-only OTA update (EAS Update) on app launch and, if
// one exists, downloads it and reloads so the user gets the fix on their very
// next app open rather than waiting for the next store release. Updates.isEnabled
// is false in Expo Go and local dev builds, so this is a no-op there.
export async function checkForOtaUpdate() {
  if (!Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // Best-effort only — the app must keep working normally on any failure
    // (offline, EAS outage, etc.), the same tradeoff as the rest of the app's
    // background enhancements.
  }
}
