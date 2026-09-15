# Arredo — arredatore AI in 2D

App web statica (niente build, niente dipendenze): dai le misure della stanza,
la posizione di porte e finestre e dici cosa ci vuoi fare; l'app propone una
disposizione dei mobili in pianta, la disegna in scala e segnala i problemi.

## Uso

```
python3 -m http.server 8000     # oppure qualunque server statico
# poi apri http://localhost:8000
```

Serve un server (i moduli ES non si caricano da `file://`).

1. **Misure** — larghezza e profondità in centimetri.
2. **Porte e finestre** — per ogni apertura: tipo, muro (nord/est/sud/ovest),
   distanza dall'angolo e larghezza. L'offset si misura da sinistra per i muri
   nord/sud, dall'alto per est/ovest.
3. **Cosa voglio fare** — camera matrimoniale, camera singola, soggiorno con TV,
   sala da pranzo, studio, cucina, monolocale, o stanza vuota da comporre a mano.

Poi «Arreda la stanza». «Altra proposta» rigenera una variante.

Sulla pianta: trascina per spostare (aggancio a muri e mobili, passo 5 cm),
`R` ruota di 90°, `Canc` elimina, frecce per spostare (Shift = 25 cm).
Si esporta in PNG e si salva/riapre il progetto in JSON.

## Come sceglie le posizioni

`js/layout.js` genera per ogni mobile un insieme di posizioni candidate
(scorrendo i muri, su griglia, o legate a un altro mobile) e le valuta:

- **Vincoli rigidi**: il mobile sta dentro la stanza, non si sovrappone ad
  altri, non invade lo spazio di manovra delle porte; i mobili alti non
  coprono le finestre.
- **Punteggio**: aderenza al muro quando previsto, spazio di manovra libero
  davanti (e ai lati per letti e tavoli), distanza dalla porta per letti e
  divani, centratura per i tavoli, angoli per i contenitori, penalità per i
  mobili davanti alle finestre.
- **Relazioni**: comodini a fianco del letto, tavolino davanti al divano,
  TV di fronte al divano a 2,3–4,2 m. Se la stanza è troppo corta la forbice
  viene allargata prima di ripiegare su una posizione libera.

Dopo la disposizione, `verifica()` rilegge la pianta e segnala sovrapposizioni,
aperture ostruite, spazi di manovra insufficienti e passaggi sotto i 60 cm.

## File

| file | contenuto |
|---|---|
| `index.html` | interfaccia e stili della pianta |
| `styles.css` | stili dell'applicazione |
| `js/catalog.js` | catalogo mobili (misure reali in cm) e programmi d'arredo |
| `js/layout.js` | geometria, motore di disposizione, verifiche |
| `js/render.js` | disegno SVG in scala, quote, export PNG |
| `js/app.js` | stato, interfaccia, trascinamento, salvataggio |

Le misure del catalogo sono taglie standard: modificale in `js/catalog.js` per
adattarle ai mobili reali.
