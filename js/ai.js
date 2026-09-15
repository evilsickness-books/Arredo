// Interpretazione della descrizione in linguaggio naturale.
// Primo tentativo: Gemini con output JSON vincolato dallo schema.
// Se non c'e' una chiave (o la chiamata fallisce) si usa il parser locale.
import { CATALOG, PROGRAMS } from './catalog.js';

const MODELLO = 'gemini-3.6-flash';
const ENDPOINT = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const ISTRUZIONI = `Estrai i dati di una stanza da una descrizione in italiano, per un programma di arredamento 2D.
Misure sempre in centimetri interi: converti i metri ("4 metri" = 400, "3 e mezzo" = 350).
Muri: nord = in alto, est = a destra, sud = in basso, ovest = a sinistra.
offset = distanza in cm dall'angolo sinistro del muro; per i muri est e ovest si misura dall'alto.
Scegli il programma d'arredo piu' vicino a quello che l'utente vuole farci.
Metti in mobili_extra solo i mobili richiesti che il programma non prevede gia'.
Se un dato manca inventane uno plausibile (stanza 400x350, porta 90 cm, finestra 140 cm) e dichiaralo in note.
Le note sono una frase breve, in italiano, sulle assunzioni fatte.`;

const SCHEMA = {
  type: 'object',
  properties: {
    larghezza: { type: 'integer' },
    profondita: { type: 'integer' },
    programma: { type: 'string', enum: Object.keys(PROGRAMS) },
    aperture: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          muro: { type: 'string', enum: ['nord', 'est', 'sud', 'ovest'] },
          offset: { type: 'integer' },
          larghezza: { type: 'integer' },
          tipo: { type: 'string', enum: ['porta', 'porta_finestra', 'finestra'] },
        },
        required: ['muro', 'offset', 'larghezza', 'tipo'],
      },
    },
    mobili_extra: { type: 'array', items: { type: 'string', enum: Object.keys(CATALOG) } },
    note: { type: 'string' },
  },
  required: ['larghezza', 'profondita', 'programma', 'aperture', 'mobili_extra', 'note'],
};

export async function interpreta(testo, chiave) {
  if (!chiave) return { ...parserLocale(testo), fonte: 'locale' };
  const risposta = await fetch(ENDPOINT(MODELLO), {
    method: 'POST',
    headers: { 'x-goog-api-key': chiave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ISTRUZIONI }] },
      contents: [{ parts: [{ text: testo }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  if (!risposta.ok) {
    const err = await risposta.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini ha risposto ${risposta.status}`);
  }
  const dati = await risposta.json();
  const parti = dati?.candidates?.[0]?.content?.parts || [];
  const json = parti.map(p => p.text).filter(Boolean).pop();
  if (!json) throw new Error('Risposta di Gemini vuota.');
  return { ...normalizza(JSON.parse(json)), fonte: 'gemini' };
}

// ---------------------------------------------------------------- parser locale

const PAROLE_PROGRAMMA = [
  ['camera_matrimoniale', /matrimonial|dormire in due|letto a due|camera da letto|\bcamera\b/i],
  ['camera_singola', /camerett|singol|bambin|ragazz/i],
  ['soggiorno_tv', /soggiorn|salotto|divano|televisor|\btv\b/i],
  ['sala_pranzo', /sala da pranzo|pranzo|tavolo grande/i],
  ['ufficio', /uffici|studio|lavorare|smart ?working|postazione/i],
  ['cucina', /cucin/i],
  ['monolocale', /monolocal|open ?space/i],
];

const PAROLE_MOBILE = [
  ['scrivania', /scrivani/i], ['libreria', /librer|libri/i], ['poltrona', /poltron/i],
  ['cassettiera', /cassettier|com[o0]/i], ['tappeto', /tappet/i], ['lavatrice', /lavatric/i],
  ['credenza', /credenz/i], ['armadio', /armadio grande|armadio a \d/i],
  ['tavolo_piccolo', /tavolino da pranzo|tavolo piccolo/i], ['frigorifero', /frigo/i],
];

const numero = s => {
  const t = s.replace(',', '.').trim();
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = parseFloat(t);
    return n < 30 ? Math.round(n * 100) : Math.round(n); // metri o centimetri
  }
  return null;
};

export function parserLocale(testo) {
  const note = [];
  let larghezza = 400, profondita = 350;
  // "4x3.5", "400 x 350", "4 metri per 3 e mezzo"
  const mis = testo.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metri|cm)?\s*(?:x|per)\s*(\d+(?:[.,]\d+)?(?:\s*e\s*mezzo)?)/i);
  if (mis) {
    larghezza = numero(mis[1]) ?? larghezza;
    profondita = numero(mis[2].replace(/\s*e\s*mezzo/i, '.5')) ?? profondita;
  } else note.push('misure non riconosciute, uso 400×350 cm');

  const aperture = [];
  // (quante) (tipo) (coda con muro/offset/larghezza, fermata prima dell'apertura dopo)
  const rxAp = /(?:(?<![\d.,])\b(\d+|due|tre|quattro)\s+)?(porte? ?finestre?|portafinestr[ae]|porte|porta|finestr[ae])((?:(?!port[ae]\b|finestr|(?:\d+|due|tre|quattro)\s+(?:port|finestr))[^.;]){0,70})/gi;
  const conta = { due: 2, tre: 3, quattro: 4 };
  for (const m of testo.matchAll(rxAp)) {
    const parola = m[2].toLowerCase();
    const tipo = /port[ae][\s-]?finestr/i.test(parola) ? 'porta_finestra'
      : (parola.startsWith('finestr') ? 'finestra' : 'porta');
    const quante = Math.min(4, conta[m[1]] || +m[1] || 1);
    const coda = m[3];
    const muro = (coda.match(/\b(nord|sud|est|ovest)\b/i) || [])[1]?.toLowerCase();
    const off = coda.match(/\ba\s+(\d+(?:[.,]\d+)?)\s*(m\b|metri|cm)?\s*(?:dall'angolo|dal muro|dall'?angolo)?/i);
    const larg = coda.match(/larg(?:a|o|he|hi|hezza)?\s*(\d+(?:[.,]\d+)?)\s*(cm|m\b)?/i);
    const base = {
      tipo,
      muro: muro || (tipo === 'finestra' ? 'nord' : 'sud'),
      offset: off ? numero(off[1]) ?? 100 : 100,
      larghezza: larg ? numero(larg[1]) ?? (tipo === 'porta' ? 90 : 140) : (tipo === 'porta' ? 90 : 140),
    };
    // piu' aperture sullo stesso muro: le distanzio, poi l'utente aggiusta
    for (let i = 0; i < quante; i++) {
      aperture.push({ ...base, offset: base.offset + i * (base.larghezza + 80) });
    }
    if (quante > 1) note.push(`${quante} ${parola} sullo stesso muro, posizioni da controllare`);
    if (!muro) note.push(`muro della ${m[1].toLowerCase()} non indicato`);
  }
  if (!aperture.length) {
    aperture.push({ muro: 'sud', offset: 100, larghezza: 90, tipo: 'porta' });
    note.push('nessuna apertura indicata, metto una porta a sud');
  }

  const programma = (PAROLE_PROGRAMMA.find(([, rx]) => rx.test(testo)) || ['vuoto'])[0];
  if (programma === 'vuoto') note.push('non ho capito la destinazione della stanza');
  const mobili_extra = PAROLE_MOBILE.filter(([k, rx]) => rx.test(testo) &&
    !PROGRAMS[programma].items.some(i => i.key === k)).map(([k]) => k);

  return {
    larghezza, profondita, programma, aperture, mobili_extra,
    note: note.length ? `Lettura locale: ${note.join('; ')}.` : 'Lettura locale della descrizione.',
  };
}

// ---------------------------------------------------------------- controlli

function normalizza(d) {
  const clamp = (v, min, max, def) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def);
  const larghezza = clamp(d.larghezza, 150, 2000, 400);
  const profondita = clamp(d.profondita, 150, 2000, 350);
  const aperture = (d.aperture || [])
    .filter(a => ['nord', 'est', 'sud', 'ovest'].includes(a.muro))
    .map(a => {
      const muroLungo = a.muro === 'nord' || a.muro === 'sud' ? larghezza : profondita;
      const larg = clamp(a.larghezza, 40, muroLungo, 90);
      return {
        muro: a.muro,
        tipo: ['porta', 'porta_finestra', 'finestra'].includes(a.tipo) ? a.tipo : 'porta',
        larghezza: larg,
        offset: clamp(a.offset, 0, muroLungo - larg, 0),
      };
    });
  return {
    larghezza, profondita, aperture,
    programma: PROGRAMS[d.programma] ? d.programma : 'vuoto',
    mobili_extra: (d.mobili_extra || []).filter(k => CATALOG[k]),
    note: typeof d.note === 'string' ? d.note : '',
  };
}
