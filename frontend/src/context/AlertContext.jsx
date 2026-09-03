import { createContext, useCallback, useContext, useState } from 'react';
import AlertContainer from '../components/Alert';

const AlertContext = createContext(null);

let idCounter = 0;

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const removeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const showAlert = useCallback(
    (message, type = 'info') => {
      const id = ++idCounter;
      setAlerts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeAlert(id), 4000);
    },
    [removeAlert],
  );

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertContainer alerts={alerts} onClose={removeAlert} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert harus dipakai di dalam <AlertProvider>');
  return ctx;
}
