// La chiave Gemini arriva da js/chiave.local.js (fuori dal repo) o, se non
// c'e', da localStorage — quella inserita col pulsante 🔑.
const LS = 'arredo.gemini';

let daFile = '';
try {
  ({ CHIAVE: daFile = '' } = await import('./chiave.local.js'));
} catch {
  // nessun file locale: si va di localStorage
}

export const chiaveDaFile = daFile.trim();

export function chiave() {
  return chiaveDaFile || localStorage.getItem(LS) || '';
}

export function salva(valore) {
  localStorage.setItem(LS, valore.trim());
}

export function dimentica() {
  localStorage.removeItem(LS);
}
