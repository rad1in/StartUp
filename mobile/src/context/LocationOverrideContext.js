import { createContext, useContext, useState } from 'react';

// A country-wide GPS-interference workaround: lets the customer drop a pin
// on a map instead of relying on the device's (possibly jammed) live GPS fix.
// Kept as a small, standalone override on top of each screen's own GPS flow
// (rather than replacing it) so existing permission/denied-state handling on
// HomeScreen/SearchScreen keeps working exactly as before when no override
// is active.
const LocationOverrideContext = createContext(null);

export function LocationOverrideProvider({ children }) {
  const [manualLocation, setManualLocation] = useState(null);

  return (
    <LocationOverrideContext.Provider
      value={{
        manualLocation,
        setManualLocation,
        clearManualLocation: () => setManualLocation(null),
      }}
    >
      {children}
    </LocationOverrideContext.Provider>
  );
}

export function useLocationOverride() {
  return useContext(LocationOverrideContext);
}
