export function formatTanggal(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTanggalWaktu(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function sudahLewatBatas(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

/** Format tanggal jadi "yyyy-mm-dd" buat atribut min/max input type="date". */
export function toDateInputValue(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}
