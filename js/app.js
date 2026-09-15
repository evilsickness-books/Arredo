import { CATALOG, PROGRAMS } from './catalog.js';
import { disponi, verifica, ingombro } from './layout.js';
import { disegna, puntoStanza, svgToPng } from './render.js';
import { interpreta, parserLocale } from './ai.js';

const $ = s => document.querySelector(s);
const svg = $('#pianta');

const stato = {
  stanza: {
    w: 400, h: 350,
    aperture: [
      { muro: 'sud', offset: 150, larghezza: 90, tipo: 'porta' },
      { muro: 'nord', offset: 130, larghezza: 140, tipo: 'finestra' },
    ],
  },
  programma: 'camera_matrimoniale',
  mobili: [],
  selezionato: null,
};

// ---------------------------------------------------------------- interfaccia

function initSelect() {
  $('#programma').innerHTML = Object.entries(PROGRAMS)
    .map(([k, p]) => `<option value="${k}">${p.nome}</option>`).join('');
  $('#programma').value = stato.programma;
  $('#aggiungi-mobile').innerHTML = '<option value="">+ aggiungi mobile…</option>' +
    Object.entries(CATALOG).map(([k, c]) => `<option value="${k}">${c.nome} (${c.w}×${c.d})</option>`).join('');
}

function renderAperture() {
  $('#aperture').innerHTML = stato.stanza.aperture.map((a, i) => `
    <div class="apertura" data-i="${i}">
      <select data-campo="tipo">
        ${['porta', 'porta_finestra', 'finestra'].map(t => `<option value="${t}" ${a.tipo === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>`).join('')}
      </select>
      <select data-campo="muro">
        ${['nord', 'est', 'sud', 'ovest'].map(m => `<option value="${m}" ${a.muro === m ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <label>a <input type="number" data-campo="offset" value="${a.offset}" min="0" step="5"> cm dall'angolo</label>
      <label>larga <input type="number" data-campo="larghezza" value="${a.larghezza}" min="40" step="5"> cm</label>
      <button class="mini" data-azione="elimina-apertura">✕</button>
    </div>`).join('');
}

function renderElenco() {
  $('#elenco').innerHTML = stato.mobili.length ? stato.mobili.map(m => {
    const c = CATALOG[m.key];
    const r = ingombro(m);
    return `<li data-id="${m.id}" class="${m.id === stato.selezionato ? 'sel' : ''}">
      <span class="pastiglia" style="background:${c.color}"></span>
      <b>${c.nome}</b> <span class="mis">${c.w}×${c.d} cm · x ${Math.round(r.x)} y ${Math.round(r.y)}</span>
      <button class="mini" data-azione="ruota">⟳</button>
      <button class="mini" data-azione="rimuovi">✕</button>
    </li>`;
  }).join('') : '<li class="vuoto">Nessun mobile. Premi «Arreda la stanza».</li>';
}

function renderAvvisi() {
  const a = verifica(stato.stanza, stato.mobili);
  $('#avvisi').innerHTML = a.length
    ? `<h3>⚠ Da controllare</h3><ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`
    : (stato.mobili.length ? '<h3 class="ok">✓ Disposizione valida</h3><p>Passaggi e aperture rispettati.</p>' : '');
}

function aggiorna() {
  disegna(svg, stato.stanza, stato.mobili, stato.selezionato);
  renderElenco();
  renderAvvisi();
}

// ---------------------------------------------------------------- azioni

function leggiStanza() {
  stato.stanza.w = Math.max(150, +$('#larghezza').value || 400);
  stato.stanza.h = Math.max(150, +$('#profondita').value || 350);
  for (const a of stato.stanza.aperture) {
    const max = (a.muro === 'nord' || a.muro === 'sud' ? stato.stanza.w : stato.stanza.h) - a.larghezza;
    a.offset = Math.min(Math.max(0, a.offset), Math.max(0, max));
  }
}

function arreda(variante = false) {
  leggiStanza();
  const r = disponi(stato.stanza, stato.programma, [], variante ? 220 : 0);
  stato.mobili = r.mobili;
  stato.selezionato = null;
  aggiorna();
  if (r.scartati.length) {
    $('#avvisi').insertAdjacentHTML('beforeend',
      `<p class="scartati">Non c'e' spazio per: ${r.scartati.join(', ')}.</p>`);
  }
}

function aggiungiMobile(key) {
  const c = CATALOG[key];
  const m = { key, cx: stato.stanza.w / 2, cy: stato.stanza.h / 2, rot: 0, id: crypto.randomUUID() };
  stato.mobili.push(m);
  stato.selezionato = m.id;
  aggiorna();
}

function ruota(id) {
  const m = stato.mobili.find(x => x.id === id);
  if (m) { m.rot = (m.rot + 90) % 360; vincola(m); aggiorna(); }
}

function vincola(m) {
  const r = ingombro(m);
  const dx = Math.min(0, r.x) + Math.max(0, r.x + r.w - stato.stanza.w);
  const dy = Math.min(0, r.y) + Math.max(0, r.y + r.h - stato.stanza.h);
  m.cx -= dx; m.cy -= dy;
}

// trascinamento con aggancio ai muri e agli altri mobili
function agganciaMobile(m) {
  const S = 12, r = ingombro(m);
  let bx = r.x, by = r.y;
  const bordiX = [0, stato.stanza.w - r.w], bordiY = [0, stato.stanza.h - r.h];
  for (const altro of stato.mobili) {
    if (altro === m) continue;
    const a = ingombro(altro);
    bordiX.push(a.x, a.x + a.w - r.w, a.x + a.w, a.x - r.w);
    bordiY.push(a.y, a.y + a.h - r.h, a.y + a.h, a.y - r.h);
  }
  for (const c of bordiX) if (Math.abs(bx - c) < S) { bx = c; break; }
  for (const c of bordiY) if (Math.abs(by - c) < S) { by = c; break; }
  m.cx = bx + r.w / 2; m.cy = by + r.h / 2;
}

// ---------------------------------------------------------------- eventi

initSelect();
renderAperture();
arreda(); // la pagina si apre gia' su una pianta, non su una stanza vuota

$('#larghezza').addEventListener('input', () => { leggiStanza(); aggiorna(); });
$('#profondita').addEventListener('input', () => { leggiStanza(); aggiorna(); });
$('#programma').addEventListener('change', e => { stato.programma = e.target.value; });
$('#arreda').addEventListener('click', () => arreda(false));
$('#variante').addEventListener('click', () => arreda(true));
$('#svuota').addEventListener('click', () => { stato.mobili = []; stato.selezionato = null; aggiorna(); });
$('#aggiungi-mobile').addEventListener('change', e => {
  if (e.target.value) { aggiungiMobile(e.target.value); e.target.value = ''; }
});
$('#aggiungi-apertura').addEventListener('click', () => {
  stato.stanza.aperture.push({ muro: 'est', offset: 60, larghezza: 90, tipo: 'porta' });
  renderAperture(); aggiorna();
});
$('#aperture').addEventListener('input', e => {
  const riga = e.target.closest('.apertura'); if (!riga) return;
  const ap = stato.stanza.aperture[+riga.dataset.i];
  const campo = e.target.dataset.campo;
  ap[campo] = campo === 'offset' || campo === 'larghezza' ? +e.target.value : e.target.value;
  leggiStanza(); aggiorna();
});
$('#aperture').addEventListener('click', e => {
  if (e.target.dataset.azione !== 'elimina-apertura') return;
  stato.stanza.aperture.splice(+e.target.closest('.apertura').dataset.i, 1);
  renderAperture(); aggiorna();
});
$('#elenco').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]'); if (!li) return;
  const id = li.dataset.id;
  const az = e.target.dataset.azione;
  if (az === 'rimuovi') stato.mobili = stato.mobili.filter(m => m.id !== id);
  else if (az === 'ruota') return ruota(id);
  else stato.selezionato = id;
  aggiorna();
});

// trascinamento sulla pianta
let drag = null;
svg.addEventListener('pointerdown', e => {
  const g = e.target.closest('.mobile');
  stato.selezionato = g ? g.dataset.id : null;
  aggiorna();
  if (!g) return;
  const m = stato.mobili.find(x => x.id === g.dataset.id);
  const p = puntoStanza(svg, e);
  drag = { m, dx: m.cx - p.x, dy: m.cy - p.y };
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = puntoStanza(svg, e);
  drag.m.cx = Math.round((p.x + drag.dx) / 5) * 5;
  drag.m.cy = Math.round((p.y + drag.dy) / 5) * 5;
  agganciaMobile(drag.m);
  vincola(drag.m);
  aggiorna();
});
svg.addEventListener('pointerup', () => { drag = null; });

document.addEventListener('keydown', e => {
  if (e.target.matches('input, select')) return;
  if (!stato.selezionato) return;
  if (e.key === 'r' || e.key === 'R') ruota(stato.selezionato);
  if (e.key === 'Delete' || e.key === 'Backspace') {
    stato.mobili = stato.mobili.filter(m => m.id !== stato.selezionato);
    stato.selezionato = null; aggiorna();
  }
  const passo = e.shiftKey ? 25 : 5;
  const m = stato.mobili.find(x => x.id === stato.selezionato);
  if (!m) return;
  if (e.key === 'ArrowLeft') m.cx -= passo;
  if (e.key === 'ArrowRight') m.cx += passo;
  if (e.key === 'ArrowUp') m.cy -= passo;
  if (e.key === 'ArrowDown') m.cy += passo;
  if (e.key.startsWith('Arrow')) { e.preventDefault(); vincola(m); aggiorna(); }
});

// esporta / importa
$('#png').addEventListener('click', async () => {
  const blob = await svgToPng(svg);
  scarica(blob, 'pianta.png');
});
$('#salva').addEventListener('click', () => {
  const dati = { stanza: stato.stanza, programma: stato.programma, mobili: stato.mobili };
  scarica(new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }), 'progetto.json');
});
$('#carica').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const dati = JSON.parse(await file.text());
  Object.assign(stato, { stanza: dati.stanza, programma: dati.programma, mobili: dati.mobili, selezionato: null });
  $('#larghezza').value = stato.stanza.w;
  $('#profondita').value = stato.stanza.h;
  $('#programma').value = stato.programma;
  renderAperture(); aggiorna();
  e.target.value = '';
});

function scarica(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------------------------------------------------------------- descrizione

const CHIAVE_LS = 'arredo.gemini';
$('#chiave').value = localStorage.getItem(CHIAVE_LS) || '';

$('#chiave-mostra').addEventListener('click', () => {
  $('#chiave-box').hidden = !$('#chiave-box').hidden;
});
$('#chiave-salva').addEventListener('click', () => {
  localStorage.setItem(CHIAVE_LS, $('#chiave').value.trim());
  esito('Chiave salvata in questo browser.');
  $('#chiave-box').hidden = true;
});
$('#chiave-elimina').addEventListener('click', () => {
  localStorage.removeItem(CHIAVE_LS);
  $('#chiave').value = '';
  esito('Chiave dimenticata: uso il parser locale.');
});

function esito(testo, errore = false) {
  const el = $('#esito');
  el.textContent = testo;
  el.classList.toggle('errore', errore);
}

$('#interpreta').addEventListener('click', async () => {
  const testo = $('#testo').value.trim();
  if (!testo) return esito('Scrivi cosa vuoi fare della stanza.', true);
  const bottone = $('#interpreta');
  bottone.disabled = true;
  esito('Interpreto la descrizione…');
  try {
    const d = await interpreta(testo, localStorage.getItem(CHIAVE_LS));
    applicaLettura(d);
    esito(`${d.fonte === 'gemini' ? 'Gemini' : 'Parser locale'}: ${PROGRAMS[d.programma].nome}, ` +
          `${d.larghezza}×${d.profondita} cm, ${d.aperture.length} aperture. ${d.note || ''}`.trim());
  } catch (e) {
    // se la chiamata a Gemini fallisce non resto a mani vuote
    const d = { ...parserLocale(testo), fonte: 'locale' };
    applicaLettura(d);
    esito(`Gemini non ha risposto (${e.message}). Ho usato il parser locale: controlla misure e aperture.`, true);
  } finally {
    bottone.disabled = false;
  }
});

function applicaLettura(d) {
  stato.stanza.w = d.larghezza;
  stato.stanza.h = d.profondita;
  stato.stanza.aperture = d.aperture.length ? d.aperture : stato.stanza.aperture;
  stato.programma = d.programma;
  $('#larghezza').value = d.larghezza;
  $('#profondita').value = d.profondita;
  $('#programma').value = d.programma;
  renderAperture();
  leggiStanza();
  const r = disponi(stato.stanza, stato.programma, d.mobili_extra || []);
  stato.mobili = r.mobili;
  stato.selezionato = null;
  aggiorna();
  if (r.scartati.length) {
    $('#avvisi').insertAdjacentHTML('beforeend',
      `<p class="scartati">Non c'e' spazio per: ${r.scartati.join(', ')}.</p>`);
  }
}
