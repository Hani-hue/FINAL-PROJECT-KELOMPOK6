export function validasiEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validasiPasswordMinimal(password, minimal = 6) {
  return typeof password === 'string' && password.length >= minimal;
}
