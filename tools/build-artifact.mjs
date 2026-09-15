// Genera la versione da pubblicare come Artifact partendo da index.html.
// L'Artifact inserisce da solo doctype, <html>, <head> e <body>: la pagina
// pubblicata deve contenere solo il contenuto, a partire dal <title>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dentro = src
  .replace(/^[\s\S]*?<title>/, '<title>')                       // via doctype/html/head
  .replace(/<\/head>\s*<body>/, '')                             // via la giuntura head/body
  .replace(/<meta[^>]*>\s*/g, '')                               // charset e viewport li mette l'host
  .replace(/<\/body>\s*<\/html>\s*$/, '')
  .trim();

mkdirSync(new URL('../artifact/', import.meta.url), { recursive: true });
writeFileSync(new URL('../artifact/index.html', import.meta.url), dentro + '\n');
console.log('artifact/index.html: %d byte', dentro.length);
