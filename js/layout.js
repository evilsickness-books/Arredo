// Motore di disposizione automatica. Tutto in centimetri.
// Sistema di riferimento: origine in alto a sinistra, x verso destra, y verso il basso.
// Muri: nord = y:0, sud = y:H, ovest = x:0, est = x:W.
import { CATALOG, PROGRAMS } from './catalog.js';

export const MURI = ['nord', 'est', 'sud', 'ovest'];
// Rotazione = direzione verso cui il mobile "guarda": 0 -> sud, 90 -> ovest, 180 -> nord, 270 -> est.
// Un mobile con lo schienale al muro nord ha rot 0.
const ROT_PER_MURO = { nord: 0, est: 90, sud: 180, ovest: 270 };
const MOBILI_ALTI = new Set(['armadio', 'armadio_piccolo', 'libreria', 'frigorifero', 'cucina_blocco', 'cucina_compatta']);

export const PROFONDITA_PORTA = 100; // spazio di manovra davanti a una porta
const PASSAGGIO_MIN = 60;            // corridoio minimo tra i mobili

export function ingombro(p) {
  const c = CATALOG[p.key];
  const orizzontale = p.rot === 0 || p.rot === 180;
  const w = orizzontale ? c.w : c.d;
  const h = orizzontale ? c.d : c.w;
  return { x: p.cx - w / 2, y: p.cy - h / 2, w, h };
}

export function versore(rot) {
  return [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }][rot / 90];
}

// Zona di rispetto davanti al mobile (e ai lati, se previsto).
export function zoneLibere(p) {
  const c = CATALOG[p.key];
  const r = ingombro(p);
  const zone = [];
  const f = c.front || 0;
  if (f > 0) {
    const v = versore(p.rot);
    if (v.y === 1) zone.push({ x: r.x, y: r.y + r.h, w: r.w, h: f });
    else if (v.y === -1) zone.push({ x: r.x, y: r.y - f, w: r.w, h: f });
    else if (v.x === 1) zone.push({ x: r.x + r.w, y: r.y, w: f, h: r.h });
    else zone.push({ x: r.x - f, y: r.y, w: f, h: r.h });
  }
  if (c.sides) {
    const orizz = p.rot === 0 || p.rot === 180;
    if (orizz) {
      zone.push({ x: r.x - c.sides, y: r.y, w: c.sides, h: r.h });
      zone.push({ x: r.x + r.w, y: r.y, w: c.sides, h: r.h });
    } else {
      zone.push({ x: r.x, y: r.y - c.sides, w: r.w, h: c.sides });
      zone.push({ x: r.x, y: r.y + r.h, w: r.w, h: c.sides });
    }
  }
  return zone;
}

export function rettAperturaMuro(stanza, ap) {
  const { w: W, h: H } = stanza;
  const s = 12; // spessore grafico del muro
  if (ap.muro === 'nord') return { x: ap.offset, y: -s / 2, w: ap.larghezza, h: s };
  if (ap.muro === 'sud') return { x: ap.offset, y: H - s / 2, w: ap.larghezza, h: s };
  if (ap.muro === 'ovest') return { x: -s / 2, y: ap.offset, w: s, h: ap.larghezza };
  return { x: W - s / 2, y: ap.offset, w: s, h: ap.larghezza };
}

// Area interna che l'apertura deve tenere sgombra.
export function zonaApertura(stanza, ap) {
  const { w: W, h: H } = stanza;
  const porta = ap.tipo !== 'finestra';
  const p = porta ? PROFONDITA_PORTA : 15;
  const m = porta ? 10 : 0; // margine laterale
  if (ap.muro === 'nord') return { x: ap.offset - m, y: 0, w: ap.larghezza + 2 * m, h: p, porta };
  if (ap.muro === 'sud') return { x: ap.offset - m, y: H - p, w: ap.larghezza + 2 * m, h: p, porta };
  if (ap.muro === 'ovest') return { x: 0, y: ap.offset - m, w: p, h: ap.larghezza + 2 * m, porta };
  return { x: W - p, y: ap.offset - m, w: p, h: ap.larghezza + 2 * m, porta };
}

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                          Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function dentroStanza(r, stanza, tol = 0) {
  return r.x >= -tol && r.y >= -tol && r.x + r.w <= stanza.w + tol && r.y + r.h <= stanza.h + tol;
}

function muroPiuVicino(stanza, r) {
  const d = { nord: r.y, sud: stanza.h - (r.y + r.h), ovest: r.x, est: stanza.w - (r.x + r.w) };
  return Object.entries(d).sort((a, b) => a[1] - b[1])[0];
}

// ---------------------------------------------------------------- candidati

function candidatiMuro(stanza, key, passo = 5) {
  const c = CATALOG[key];
  const out = [];
  for (const muro of MURI) {
    const rot = ROT_PER_MURO[muro];
    const orizz = rot === 0 || rot === 180;
    const lung = orizz ? c.w : c.w;   // il fronte corre sempre lungo il muro
    const prof = c.d;
    if (muro === 'nord' || muro === 'sud') {
      if (lung > stanza.w) continue;
      const cy = muro === 'nord' ? prof / 2 : stanza.h - prof / 2;
      for (let x = lung / 2; x <= stanza.w - lung / 2 + 0.01; x += passo) out.push({ key, cx: x, cy, rot, muro });
    } else {
      if (lung > stanza.h) continue;
      const cx = muro === 'ovest' ? prof / 2 : stanza.w - prof / 2;
      for (let y = lung / 2; y <= stanza.h - lung / 2 + 0.01; y += passo) out.push({ key, cx, cy: y, rot, muro });
    }
  }
  return out;
}

function candidatiGriglia(stanza, key, rots = [0, 90], passo = 20) {
  const out = [];
  for (const rot of rots) {
    for (let x = 0; x <= stanza.w; x += passo) {
      for (let y = 0; y <= stanza.h; y += passo) out.push({ key, cx: x, cy: y, rot });
    }
  }
  return out;
}

function candidatiRelativi(stanza, item, rif, allarga = false) {
  const rel = item.rel, c = CATALOG[item.key];
  if (!rif) return [];
  const rr = ingombro(rif), v = versore(rif.rot);
  const out = [];
  if (rel.tipo === 'fianco') {
    // a fianco del mobile di riferimento, stesso orientamento, allineato allo schienale
    const rot = rif.rot;
    const orizz = rot === 0 || rot === 180;
    const lato = rel.lato * (rot === 0 || rot === 270 ? 1 : -1);
    const gap = rel.gap ?? 5;
    if (orizz) {
      const cx = lato > 0 ? rr.x + rr.w + gap + c.w / 2 : rr.x - gap - c.w / 2;
      const cy = rot === 0 ? rr.y + c.d / 2 : rr.y + rr.h - c.d / 2;
      out.push({ key: item.key, cx, cy, rot });
    } else {
      const cy = lato > 0 ? rr.y + rr.h + gap + c.w / 2 : rr.y - gap - c.w / 2;
      const cx = rot === 270 ? rr.x + c.d / 2 : rr.x + rr.w - c.d / 2;
      out.push({ key: item.key, cx, cy, rot });
    }
  } else if (rel.tipo === 'davanti') {
    const gap = rel.gap ?? 40;
    const rot = (rif.rot + 180) % 360;
    const orizz = rot === 0 || rot === 180;
    const prof = orizz ? c.d : c.w;
    for (const g of [gap, gap + 15, gap - 10]) {
      const cx = rr.x + rr.w / 2 + v.x * (Math.abs(v.x) * (rr.w / 2 + g + prof / 2));
      const cy = rr.y + rr.h / 2 + v.y * (Math.abs(v.y) * (rr.h / 2 + g + prof / 2));
      out.push({ key: item.key, cx, cy, rot: item.key === 'tappeto' ? rif.rot : rot });
    }
  } else if (rel.tipo === 'fronte') {
    // di fronte, tipicamente a muro: filtro i candidati a muro per orientamento e distanza
    // con stanze corte la distanza ideale non ci sta: allargo la forbice
    const min = allarga ? 90 : (rel.min ?? 200), max = allarga ? 600 : (rel.max ?? 400);
    for (const cand of candidatiMuro(stanza, item.key, 10)) {
      if (cand.rot !== (rif.rot + 180) % 360) continue;
      const cr = ingombro(cand);
      const dist = v.y !== 0
        ? (v.y > 0 ? cr.y - (rr.y + rr.h) : rr.y - (cr.y + cr.h))
        : (v.x > 0 ? cr.x - (rr.x + rr.w) : rr.x - (cr.x + cr.w));
      if (dist < min || dist > max) continue;
      const sovr = v.y !== 0
        ? Math.min(cr.x + cr.w, rr.x + rr.w) - Math.max(cr.x, rr.x)
        : Math.min(cr.y + cr.h, rr.y + rr.h) - Math.max(cr.y, rr.y);
      if (sovr < Math.min(cr.w, rr.w) * 0.5) continue;
      out.push(cand);
    }
  }
  return out;
}

// ---------------------------------------------------------------- punteggio

function valuta(stanza, cand, contesto, rumore = 0) {
  const c = CATALOG[cand.key];
  const r = ingombro(cand);
  if (!dentroStanza(r, stanza, 0.5)) return null;

  // vincoli rigidi: niente sovrapposizioni con altri mobili o con le porte
  for (const p of contesto.posizionati) {
    if (CATALOG[p.key].flat || c.flat) continue;
    if (overlap(r, ingombro(p)) > 1) return null;
  }
  for (const z of contesto.zoneAperture) {
    if (c.flat) continue;
    if (z.porta && overlap(r, z) > 1) return null;
    if (!z.porta && MOBILI_ALTI.has(cand.key) && overlap(r, z) > 1) return null;
  }

  let punti = 0;
  // il mobile deve stare davvero appoggiato al muro quando previsto
  if (c.anchor === 'wall') {
    const [, dist] = muroPiuVicino(stanza, r);
    punti -= dist * 2;
  }
  if (c.anchor === 'center') {
    punti -= Math.abs(r.x + r.w / 2 - stanza.w / 2) * 0.6;
    punti -= Math.abs(r.y + r.h / 2 - stanza.h / 2) * 0.6;
  }
  // zone di rispetto: penalizzo se invase da mobili, muri o porte
  for (const z of zoneLibere(cand)) {
    const area = Math.max(1, z.w * z.h);
    let invasa = 0;
    for (const p of contesto.posizionati) {
      if (CATALOG[p.key].flat) continue;
      invasa += overlap(z, ingombro(p));
    }
    for (const za of contesto.zoneAperture) if (za.porta) invasa += overlap(z, za) * 1.5;
    // parte fuori dalla stanza = contro un muro
    const dentro = overlap(z, { x: 0, y: 0, w: stanza.w, h: stanza.h });
    invasa += (area - dentro) * 1.2;
    punti -= (invasa / area) * 260;
  }
  // il letto/divano stanno bene lontani dalla porta
  if (contesto.porta && (cand.key.startsWith('letto') || cand.key.startsWith('divano'))) {
    const dp = Math.hypot(r.x + r.w / 2 - contesto.porta.cx, r.y + r.h / 2 - contesto.porta.cy);
    punti += Math.min(dp, 500) * 0.25;
  }
  // meglio non piazzare mobili davanti alle finestre, il letto men che meno
  for (const z of contesto.zoneAperture) {
    if (z.porta || overlap(r, z) < 1) continue;
    punti -= c.headboard ? 180 : (c.d >= 40 ? 120 : 40);
  }
  // preferenza per gli angoli nei mobili contenitore
  if (MOBILI_ALTI.has(cand.key)) {
    const bordo = Math.min(r.x, stanza.w - (r.x + r.w), r.y, stanza.h - (r.y + r.h));
    punti -= bordo * 0.3;
  }
  return punti + (rumore ? (Math.random() - 0.5) * rumore : 0);
}

// ---------------------------------------------------------------- solutore

export function disponi(stanza, programma, extra = [], rumore = 0) {
  const prog = PROGRAMS[programma] || PROGRAMS.vuoto;
  const lista = [...prog.items, ...extra.map(k => ({ key: k }))];
  const zoneAperture = stanza.aperture.map(a => zonaApertura(stanza, a));
  const portaPrinc = stanza.aperture.find(a => a.tipo !== 'finestra');
  const zp = portaPrinc ? zonaApertura(stanza, portaPrinc) : null;
  const contesto = {
    posizionati: [],
    zoneAperture,
    porta: zp ? { cx: zp.x + zp.w / 2, cy: zp.y + zp.h / 2 } : null,
  };
  const scartati = [];

  for (const item of lista) {
    const c = CATALOG[item.key];
    if (!c) continue;
    // provo prima la disposizione "ideale" legata al mobile di riferimento,
    // poi una versione allargata, e solo alla fine una posizione libera.
    const tentativi = [];
    if (item.rel) {
      const rif = [...contesto.posizionati].reverse().find(p => p.key === item.rel.to);
      tentativi.push(() => candidatiRelativi(stanza, item, rif, false));
      tentativi.push(() => candidatiRelativi(stanza, item, rif, true));
    }
    tentativi.push(() => fallbackCandidati(stanza, item.key));

    let best = null;
    for (const gen of tentativi) {
      let bestPunti = -Infinity;
      for (const cand of gen()) {
        const p = valuta(stanza, cand, contesto, rumore);
        if (p === null) continue;
        if (p > bestPunti) { bestPunti = p; best = cand; }
      }
      if (best) break;
    }
    if (best) contesto.posizionati.push({ ...best, id: crypto.randomUUID() });
    else scartati.push(c.nome);
  }
  return { mobili: contesto.posizionati, scartati };
}

function fallbackCandidati(stanza, key) {
  const c = CATALOG[key];
  if (c.anchor === 'wall') return candidatiMuro(stanza, key);
  if (c.anchor === 'center') return candidatiGriglia(stanza, key, [0, 90], 10);
  return candidatiGriglia(stanza, key, [0, 90, 180, 270], 15);
}

// ---------------------------------------------------------------- verifiche

export function verifica(stanza, mobili) {
  const avvisi = [];
  const zone = stanza.aperture.map(a => ({ ap: a, z: zonaApertura(stanza, a) }));
  for (let i = 0; i < mobili.length; i++) {
    const a = mobili[i], ra = ingombro(a);
    if (!dentroStanza(ra, stanza, 0.5)) avvisi.push(`${CATALOG[a.key].nome} esce dalla stanza.`);
    for (let j = i + 1; j < mobili.length; j++) {
      const b = mobili[j];
      if (CATALOG[a.key].flat || CATALOG[b.key].flat) continue;
      if (overlap(ra, ingombro(b)) > 25) avvisi.push(`${CATALOG[a.key].nome} e ${CATALOG[b.key].nome} si sovrappongono.`);
    }
    for (const { ap, z } of zone) {
      if (CATALOG[a.key].flat) continue;
      if (z.porta && overlap(ra, z) > 100) avvisi.push(`${CATALOG[a.key].nome} ostruisce l'apertura della porta (${ap.muro}).`);
      if (!z.porta && MOBILI_ALTI.has(a.key) && overlap(ra, z) > 100) avvisi.push(`${CATALOG[a.key].nome} copre la finestra (${ap.muro}).`);
    }
    for (const z of zoneLibere(a)) {
      for (const b of mobili) {
        if (b === a || CATALOG[b.key].flat) continue;
        if (overlap(z, ingombro(b)) > z.w * z.h * 0.45) {
          avvisi.push(`Poco spazio di manovra davanti a ${CATALOG[a.key].nome}.`);
          break;
        }
      }
    }
  }
  const passaggio = passaggioMinimo(stanza, mobili);
  if (passaggio !== null && passaggio < PASSAGGIO_MIN) {
    avvisi.push(`Passaggio piu' stretto di ${PASSAGGIO_MIN} cm (${Math.round(passaggio)} cm).`);
  }
  return [...new Set(avvisi)];
}

// Distanza libera minima tra mobili "vicini" lungo x e y: stima grezza dei corridoi.
function passaggioMinimo(stanza, mobili) {
  const rect = mobili.filter(m => !CATALOG[m.key].flat).map(ingombro);
  const bordi = [
    { x: -50, y: 0, w: 50, h: stanza.h }, { x: stanza.w, y: 0, w: 50, h: stanza.h },
    { x: 0, y: -50, w: stanza.w, h: 50 }, { x: 0, y: stanza.h, w: stanza.w, h: 50 },
  ];
  const tutti = [...rect, ...bordi];
  let min = null;
  for (let i = 0; i < tutti.length; i++) {
    for (let j = i + 1; j < tutti.length; j++) {
      const a = tutti[i], b = tutti[j];
      const sovrY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const sovrX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      // conta solo i varchi "lunghi": due mobili affiancati con un filo di gioco
      // non sono un corridoio, mentre 40 cm tra parete e letto lo sono.
      if (sovrY > 90 && sovrX < 0) {
        const d = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
        if (d > 10 && d < 200 && (min === null || d < min)) min = d;
      }
      if (sovrX > 90 && sovrY < 0) {
        const d = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h);
        if (d > 10 && d < 200 && (min === null || d < min)) min = d;
      }
    }
  }
  return min;
}
