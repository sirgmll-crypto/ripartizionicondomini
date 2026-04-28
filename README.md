# Ripartizione acqua condominiale

App statica per ripartire la bolletta Pavia Acque tra 7 immobili. Funziona sia in locale sia pubblicata su un URL pubblico, senza backend.

## Come si usa

1. Apri `index.html` in locale oppure pubblica la cartella su un hosting statico.
2. Clicca `Importa PDF Pavia Acque` e seleziona la bolletta del mese.
3. Controlla i dati importati dalla bolletta.
4. Inserisci i `m3` di ciascun immobile.
5. Leggi la tabella finale oppure clicca `Esporta PDF`.

## GitHub

La cartella e' pronta per essere caricata su GitHub.

File locali esclusi automaticamente:

- `.DS_Store`
- `.vercel`

Comandi base:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/TUO-REPO.git
git push -u origin main
```

## Pubblicazione

L'app e' pronta per essere pubblicata come sito statico.

### Vercel

1. Carica questa cartella su GitHub.
2. Importa il repository su Vercel.
3. Lascia vuoti `Build Command` e `Output Directory`.
4. Pubblica: Vercel servira' direttamente `index.html`.

Il file `vercel.json` e' gia' incluso con impostazioni base per URL puliti e header essenziali.

### Altri hosting statici

Puoi pubblicarla senza modifiche anche su Netlify, Cloudflare Pages o GitHub Pages, perche' non richiede API server o build.

## Dati importati dal PDF

- numero fattura
- scadenza pagamento
- indirizzo fornitura
- consumo totale fatturato
- quota fissa
- acquedotto
- fognatura
- depurazione
- oneri perequazione
- restituzione acconti

## Note

- L'app salva i dati in locale nel browser del dispositivo da cui la apri.
- L'import del PDF avviene lato browser: il file non viene caricato su un server.
- Il pulsante `Reset` svuota i campi ma mantiene la struttura dei 7 immobili.
- I residenti sono fissi a `2` per tutti e non sono mostrati nell'interfaccia.
- Il PDF finale riporta condominio o via, numero fattura, scadenza pagamento e tabella di ripartizione.
- Se Pavia Acque cambia molto il layout della bolletta, puo' essere necessario correggere a mano una o due voci.
- Per prudenza ho impostato `noindex` e `robots.txt` bloccato: il sito puo' essere pubblico ma non indicizzato dai motori di ricerca.
