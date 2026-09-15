// Disegno della pianta in SVG. Unita' di lavoro: centimetri, convertiti in
// unita' SVG 1:1 tramite viewBox, cosi' le misure restano leggibili.
import { CATALOG } from './catalog.js';
import { ingombro, versore } from './layout.js';

const MARG = 90; // margine attorno alla stanza, per quote e muri

export function disegna(svg, stanza, mobili, selezionato) {
  const W = stanza.w, H = stanza.h;
  svg.setAttribute('viewBox', `${-MARG} ${-MARG} ${W + 2 * MARG} ${H + 2 * MARG}`);
  const parti = [];

  parti.push(griglia(W, H));
  parti.push(`<rect class="pavimento" x="0" y="0" width="${W}" height="${H}"/>`);
  parti.push(muri(stanza));
  for (const ap of stanza.aperture) parti.push(apertura(stanza, ap));
  for (const m of mobili) parti.push(mobile(m, m.id === selezionato));
  parti.push(quote(W, H));

  svg.innerHTML = parti.join('');
}

function griglia(W, H) {
  const l = [];
  for (let x = 0; x <= W; x += 50) l.push(`<line class="griglia" x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  for (let y = 0; y <= H; y += 50) l.push(`<line class="griglia" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  return `<g>${l.join('')}</g>`;
}

function muri(stanza) {
  const s = 12, W = stanza.w, H = stanza.h;
  return `<g class="muro">
    <rect x="${-s}" y="${-s}" width="${W + 2 * s}" height="${s}"/>
    <rect x="${-s}" y="${H}" width="${W + 2 * s}" height="${s}"/>
    <rect x="${-s}" y="0" width="${s}" height="${H}"/>
    <rect x="${W}" y="0" width="${s}" height="${H}"/>
  </g>`;
}

function apertura(stanza, ap) {
  const s = 12, W = stanza.w, H = stanza.h, L = ap.larghezza, o = ap.offset;
  const porta = ap.tipo !== 'finestra';
  let buco, arco = '', etichetta;
  if (ap.muro === 'nord' || ap.muro === 'sud') {
    const y = ap.muro === 'nord' ? -s : H;
    buco = `<rect class="${porta ? 'vano' : 'finestra'}" x="${o}" y="${y}" width="${L}" height="${s}"/>`;
    const dir = ap.muro === 'nord' ? 1 : -1;
    const y0 = ap.muro === 'nord' ? 0 : H;
    if (porta) arco = `<path class="arco" d="M ${o} ${y0} L ${o} ${y0 + dir * L} A ${L} ${L} 0 0 ${dir > 0 ? 0 : 1} ${o + L} ${y0}"/>`;
    etichetta = testo(o + L / 2, y0 + dir * 26, `${ap.tipo === 'finestra' ? 'finestra' : 'porta'} ${L}`, 'et-apertura');
  } else {
    const x = ap.muro === 'ovest' ? -s : W;
    buco = `<rect class="${porta ? 'vano' : 'finestra'}" x="${x}" y="${o}" width="${s}" height="${L}"/>`;
    const dir = ap.muro === 'ovest' ? 1 : -1;
    const x0 = ap.muro === 'ovest' ? 0 : W;
    if (porta) arco = `<path class="arco" d="M ${x0} ${o} L ${x0 + dir * L} ${o} A ${L} ${L} 0 0 ${dir > 0 ? 1 : 0} ${x0} ${o + L}"/>`;
    etichetta = testo(x0 + dir * 30, o + L / 2, `${ap.tipo === 'finestra' ? 'finestra' : 'porta'} ${L}`, 'et-apertura', dir > 0 ? 90 : 90);
  }
  return `<g>${buco}${arco}${etichetta}</g>`;
}

function mobile(m, selezionato) {
  const c = CATALOG[m.key];
  const r = ingombro(m);
  const v = versore(m.rot);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // tacca sul lato "fronte", per capire a colpo d'occhio l'orientamento
  const fx = cx + v.x * (v.x ? r.w / 2 : 0), fy = cy + v.y * (v.y ? r.h / 2 : 0);
  const fronte = `<line class="fronte" x1="${fx - (v.y ? r.w / 2 - 6 : 0)}" y1="${fy - (v.x ? r.h / 2 - 6 : 0)}"
                        x2="${fx + (v.y ? r.w / 2 - 6 : 0)}" y2="${fy + (v.x ? r.h / 2 - 6 : 0)}"/>`;
  // l'etichetta si accorcia (e rimpicciolisce) finche' entra nel mobile
  const ruotaTesto = r.h > r.w * 1.4 ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
  const spazio = (ruotaTesto ? r.h : r.w) - 8;
  const largo = (testo, corpo) => testo.length * corpo * 0.58;
  let dim = 13;
  let etichetta = `${c.nome} ${c.w}×${c.d}`;
  if (largo(etichetta, dim) > spazio) etichetta = c.nome;
  if (largo(etichetta, dim) > spazio) dim = spazio / (etichetta.length * 0.58);
  // sotto gli 8 px non si legge: il mobile resta senza etichetta, il nome
  // e' comunque nell'elenco a fianco
  if (dim < 8) etichetta = '';
  return `<g class="mobile ${selezionato ? 'sel' : ''} ${c.flat ? 'piatto' : ''}" data-id="${m.id}">
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${c.color}"/>
    ${c.flat ? '' : fronte}
    <text x="${cx}" y="${cy + 4}" class="et-mobile" style="font-size:${dim.toFixed(1)}px"${ruotaTesto}>${etichetta}</text>
  </g>`;
}

function quote(W, H) {
  const o = 45;
  return `<g class="quota">
    <line x1="0" y1="${-o}" x2="${W}" y2="${-o}"/>
    <line x1="0" y1="${-o - 8}" x2="0" y2="${-o + 8}"/>
    <line x1="${W}" y1="${-o - 8}" x2="${W}" y2="${-o + 8}"/>
    ${testo(W / 2, -o - 10, `${W} cm`, 'et-quota')}
    <line x1="${-o}" y1="0" x2="${-o}" y2="${H}"/>
    <line x1="${-o - 8}" y1="0" x2="${-o + 8}" y2="0"/>
    <line x1="${-o - 8}" y1="${H}" x2="${-o + 8}" y2="${H}"/>
    ${testo(-o - 10, H / 2, `${H} cm`, 'et-quota', -90)}
  </g>`;
}

function testo(x, y, s, cls, rot = 0) {
  const t = rot ? ` transform="rotate(${rot} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" class="${cls}"${t}>${s}</text>`;
}

// Converte un punto dello schermo in coordinate stanza (cm).
export function puntoStanza(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

export function svgToPng(svg, scala = 3) {
  const vb = svg.viewBox.baseVal;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', vb.width * scala / 3);
  clone.setAttribute('height', vb.height * scala / 3);
  const css = document.querySelector('#stili-pianta').textContent;
  clone.insertAdjacentHTML('afterbegin', `<style>${css}</style><rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="#fff"/>`);
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = vb.width * scala; cv.height = vb.height * scala;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(b => res(b), 'image/png');
    };
    img.onerror = rej;
    img.src = url;
  });
}
