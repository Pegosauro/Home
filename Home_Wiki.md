# Home App — Wiki / Changelog

## Versione V3.0.0 — Supabase cloud sync opzionale

Data: 2026-06-22

## Obiettivo

Aggiungere un backend opzionale diverso da Google Drive, mantenendo Home App locale, offline-first e compatibile con GitHub Pages.

## Modifiche lato UI

- Aggiunto pannello `Backup Supabase` nella sezione Opzioni.
- Campi disponibili:
  - Project URL Supabase;
  - anon public key;
  - nome tabella;
  - email utente Supabase Auth;
  - password per login.
- Azioni disponibili:
  - Salva configurazione;
  - Accedi;
  - Scollega;
  - Backup ora;
  - Ripristina;
  - Auto backup ON/OFF.
- Stato visibile:
  - collegato/non collegato;
  - utente attivo;
  - ultima sincronizzazione.

## Modifiche lato codice

- Aggiunto nuovo file `cloud-sync.js`.
- `app.js` non viene modificato.
- `index.html` carica `cloud-sync.js` dopo `app.js`.
- `sw.js` aggiorna la cache a `casa-app-3.0.0-supabase-sync` e include `cloud-sync.js` nell'app shell.
- Il modulo Supabase:
  - legge/scrive i dati da `localStorage` usando la chiave esistente `casa-app-v2-data`;
  - usa Supabase Auth con email/password;
  - salva il backup nella tabella `home_backups`;
  - applica restore sostituendo i dati locali e ricaricando l'app;
  - intercetta `localStorage.setItem` per programmare backup automatici dopo modifiche.

## Regole interne aggiornate

- Il salvataggio locale resta la fonte primaria dei dati.
- Supabase è un sistema cloud opzionale, non obbligatorio.
- Google Drive non viene rimosso in questa fase.
- Non inserire service role key o chiavi segrete nel frontend.
- Usare solo anon public key lato app.
- La sicurezza dati deve essere gestita tramite Supabase Auth e Row Level Security.

## Controlli eseguiti

- Controllo sintassi `cloud-sync.js` con `node --check`.
- Controllo sintassi `sw.js` con `node --check`.

## Prossimi sviluppi consigliati

1. Integrare il pannello Supabase direttamente nell'UI nativa di `app.js` invece del modulo esterno.
2. Aggiungere confronto tra backup locale e cloud con scelta: mantieni locale / carica cloud.
3. Aggiungere storico backup invece di singolo backup per utente.
4. Valutare rimozione Google Drive solo dopo test positivi di Supabase.
