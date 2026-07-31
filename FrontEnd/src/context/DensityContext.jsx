import { createContext, useContext, useEffect, useState } from 'react';

const DensityContext = createContext(null);
const KEY = 'et-cafe-admin-density';

export function DensityProvider({ children }) {
  const [dense, setDense] = useState(() => localStorage.getItem(KEY) === 'dense');

  useEffect(() => {
    localStorage.setItem(KEY, dense ? 'dense' : 'comfortable');
  }, [dense]);

  return (
    <DensityContext.Provider value={{ dense, toggleDense: () => setDense((d) => !d) }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  return useContext(DensityContext) || { dense: false, toggleDense: () => {} };
}
