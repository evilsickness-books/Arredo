// Catalogo mobili: misure reali in centimetri.
// w = larghezza (fronte), d = profondita'. Le rotazioni sono sempre multipli di 90°.
export const CATALOG = {
  letto_matrimoniale: { nome: 'Letto matrimoniale', w: 160, d: 200, anchor: 'wall', front: 60, sides: 60, headboard: true, color: '#cfe3f7' },
  letto_singolo:      { nome: 'Letto singolo',      w: 90,  d: 200, anchor: 'wall', front: 60, sides: 55, headboard: true, color: '#cfe3f7' },
  comodino:           { nome: 'Comodino',           w: 45,  d: 40,  anchor: 'relative', front: 30, color: '#e6d7f5' },
  armadio:            { nome: 'Armadio',            w: 250, d: 60,  anchor: 'wall', front: 90, color: '#f1dfc4' },
  armadio_piccolo:    { nome: 'Armadio 2 ante',     w: 120, d: 60,  anchor: 'wall', front: 90, color: '#f1dfc4' },
  cassettiera:        { nome: 'Cassettiera',        w: 100, d: 45,  anchor: 'wall', front: 70, color: '#f1dfc4' },
  divano:             { nome: 'Divano 3 posti',     w: 220, d: 90,  anchor: 'wall', front: 80, color: '#d7ecd9' },
  divano_2:           { nome: 'Divano 2 posti',     w: 160, d: 90,  anchor: 'wall', front: 80, color: '#d7ecd9' },
  poltrona:           { nome: 'Poltrona',           w: 80,  d: 85,  anchor: 'free', front: 50, color: '#d7ecd9' },
  tavolino:           { nome: 'Tavolino',           w: 110, d: 60,  anchor: 'relative', front: 40, color: '#ede3cf' },
  mobile_tv:          { nome: 'Mobile TV',          w: 180, d: 45,  anchor: 'wall', front: 60, color: '#dfe2e8' },
  libreria:           { nome: 'Libreria',           w: 90,  d: 35,  anchor: 'wall', front: 70, color: '#f1dfc4' },
  scrivania:          { nome: 'Scrivania',          w: 140, d: 70,  anchor: 'wall', front: 90, color: '#e8e0d0' },
  sedia:              { nome: 'Sedia',              w: 45,  d: 50,  anchor: 'relative', front: 20, color: '#eee' },
  tavolo_pranzo:      { nome: 'Tavolo da pranzo',   w: 160, d: 90,  anchor: 'center', front: 80, sides: 80, color: '#ede3cf' },
  tavolo_piccolo:     { nome: 'Tavolo 4 posti',     w: 120, d: 80,  anchor: 'center', front: 75, sides: 75, color: '#ede3cf' },
  credenza:           { nome: 'Credenza',           w: 160, d: 45,  anchor: 'wall', front: 70, color: '#f1dfc4' },
  cucina_blocco:      { nome: 'Blocco cucina',      w: 240, d: 60,  anchor: 'wall', front: 100, color: '#dfe7ef' },
  cucina_compatta:    { nome: 'Cucina compatta',    w: 150, d: 60,  anchor: 'wall', front: 100, color: '#dfe7ef' },
  frigorifero:        { nome: 'Frigorifero',        w: 60,  d: 65,  anchor: 'wall', front: 90, color: '#dfe7ef' },
  lavatrice:          { nome: 'Lavatrice',          w: 60,  d: 60,  anchor: 'wall', front: 80, color: '#dfe7ef' },
  tappeto:            { nome: 'Tappeto',            w: 200, d: 140, anchor: 'relative', front: 0, flat: true, color: '#f6efe2' },
};

// Programmi: "cosa voglio fare" -> elenco mobili in ordine di priorita'.
// rel: vincolo rispetto a un altro mobile gia' posizionato.
export const PROGRAMS = {
  camera_matrimoniale: {
    nome: 'Camera matrimoniale',
    items: [
      { key: 'letto_matrimoniale' },
      { key: 'comodino', rel: { to: 'letto_matrimoniale', tipo: 'fianco', lato: -1, gap: 5 }, opzionale: true },
      { key: 'comodino', rel: { to: 'letto_matrimoniale', tipo: 'fianco', lato: 1, gap: 5 }, opzionale: true },
      { key: 'armadio' },
      { key: 'cassettiera', opzionale: true },
    ],
  },
  camera_singola: {
    nome: 'Camera singola / cameretta',
    items: [
      { key: 'letto_singolo' },
      { key: 'comodino', rel: { to: 'letto_singolo', tipo: 'fianco', lato: 1, gap: 5 }, opzionale: true },
      { key: 'armadio_piccolo' },
      { key: 'scrivania' },
      { key: 'sedia', rel: { to: 'scrivania', tipo: 'davanti', gap: 15 }, opzionale: true },
      { key: 'libreria', opzionale: true },
    ],
  },
  soggiorno_tv: {
    nome: 'Soggiorno con TV',
    items: [
      { key: 'divano' },
      { key: 'mobile_tv', rel: { to: 'divano', tipo: 'fronte', min: 230, max: 420 } },
      { key: 'tappeto', rel: { to: 'divano', tipo: 'davanti', gap: 25 }, opzionale: true },
      { key: 'tavolino', rel: { to: 'divano', tipo: 'davanti', gap: 45 } },
      { key: 'poltrona', opzionale: true },
      { key: 'libreria', opzionale: true },
    ],
  },
  sala_pranzo: {
    nome: 'Sala da pranzo',
    items: [
      { key: 'tavolo_pranzo' },
      { key: 'credenza' },
      { key: 'libreria', opzionale: true },
    ],
  },
  ufficio: {
    nome: 'Studio / ufficio',
    items: [
      { key: 'scrivania' },
      { key: 'sedia', rel: { to: 'scrivania', tipo: 'davanti', gap: 15 } },
      { key: 'libreria' },
      { key: 'libreria', opzionale: true },
      { key: 'cassettiera', opzionale: true },
      { key: 'poltrona', opzionale: true },
    ],
  },
  cucina: {
    nome: 'Cucina abitabile',
    items: [
      { key: 'cucina_blocco' },
      { key: 'frigorifero' },
      { key: 'tavolo_piccolo' },
      { key: 'credenza', opzionale: true },
      { key: 'lavatrice', opzionale: true },
    ],
  },
  monolocale: {
    nome: 'Monolocale',
    items: [
      { key: 'cucina_compatta' },
      { key: 'letto_matrimoniale' },
      { key: 'divano_2' },
      { key: 'mobile_tv', rel: { to: 'divano_2', tipo: 'fronte', min: 200, max: 400 }, opzionale: true },
      { key: 'tavolo_piccolo' },
      { key: 'armadio_piccolo', opzionale: true },
    ],
  },
  vuoto: { nome: 'Stanza vuota (aggiungo io)', items: [] },
};
