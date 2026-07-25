import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Battery from 'expo-battery';

const BatteryContext = createContext({ batteryLevel: 1, isLowPowerMode: false, isLowBattery: false });

// Hysteresis so the app doesn't flicker in/out of low-usage mode right at the
// 20% line: it engages at 20% and only clears once the level recovers past
// 30% (or the OS low-power mode is turned off).
const ENTER_THRESHOLD = 0.2;
const EXIT_THRESHOLD = 0.3;

export function BatteryProvider({ children }) {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [systemLowPower, setSystemLowPower] = useState(false);
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return; // expo-battery's web support is Chromium-only and non-essential here
    let mounted = true;

    Battery.getBatteryLevelAsync().then((level) => mounted && setBatteryLevel(level));
    Battery.isLowPowerModeEnabledAsync().then((v) => mounted && setSystemLowPower(v));

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel: level }) => setBatteryLevel(level));
    const powerSub = Battery.addLowPowerModeListener(({ lowPowerMode }) => setSystemLowPower(lowPowerMode));

    return () => {
      mounted = false;
      levelSub.remove();
      powerSub.remove();
    };
  }, []);

  useEffect(() => {
    setIsLowBattery((prev) => {
      if (systemLowPower) return true;
      if (batteryLevel < 0 || batteryLevel > 1) return prev; // unknown reading — don't act on it
      if (!prev && batteryLevel <= ENTER_THRESHOLD) return true;
      if (prev && batteryLevel >= EXIT_THRESHOLD && !systemLowPower) return false;
      return prev;
    });
  }, [batteryLevel, systemLowPower]);

  return (
    <BatteryContext.Provider value={{ batteryLevel, isLowPowerMode: systemLowPower, isLowBattery }}>
      {children}
    </BatteryContext.Provider>
  );
}

export function useBattery() {
  return useContext(BatteryContext);
}
