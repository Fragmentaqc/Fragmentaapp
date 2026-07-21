export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export function validatePassword(password: string, minimumLength = 8) {
  if (password.length < minimumLength) return `Utilise au moins ${minimumLength} caractères.`;
  return null;
}

export function passwordsMatch(password: string, confirmation: string) {
  return password === confirmation;
}
