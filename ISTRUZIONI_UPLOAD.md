# Istruzioni upload patch Home App

La modifica diretta su GitHub non è stata possibile perché l'integrazione GitHub ha restituito errore 403 sui permessi di scrittura.

## File da caricare nella root della repository

Sostituire:

- `index.html`
- `sw.js`

Aggiungere:

- `cloud-sync.js`
- `SUPABASE_SETUP.md`
- `Home_Wiki.md`

## Dopo il caricamento

1. Apri GitHub Pages dell'app.
2. Quando compare il toast `Nuova versione disponibile`, premi `Aggiorna`.
3. Vai in `Opzioni`.
4. Configura `Backup Supabase`.
