const TIPE_CLASSES = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
};

/**
 * Komponen tampilan murni buat daftar toast — logic state-nya ada di context/AlertContext.jsx.
 * Ini komponen alert/toast bersama yang dipakai lewat showAlert(), bukan alert() bawaan browser.
 */
function AlertContainer({ alerts, onClose }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border shadow-sm text-sm ${TIPE_CLASSES[alert.type] || TIPE_CLASSES.info}`}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => onClose(alert.id)}
            className="font-bold leading-none hover:opacity-70"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertContainer;
