const STATUS_CONFIG = {
  menunggu_konfirmasi: {
    label: 'Menunggu Konfirmasi',
    classes: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  dipinjam: { label: 'Dipinjam', classes: 'bg-blue-100 text-blue-700 border-blue-300' },
  ditolak: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 border-red-300' },
  menunggu_pengembalian: {
    label: 'Menunggu Pengembalian',
    classes: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  dikembalikan: { label: 'Dikembalikan', classes: 'bg-green-100 text-green-700 border-green-300' },
  menunggu: { label: 'Menunggu', classes: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  disetujui: { label: 'Disetujui', classes: 'bg-green-100 text-green-700 border-green-300' },
};

function StatusBadge({ status }) {
  const { label, classes } = STATUS_CONFIG[status] || {
    label: status,
    classes: 'bg-leather-100 text-leather-700 border-leather-300',
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${classes}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
