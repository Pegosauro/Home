# Setup Supabase per Home App

## Obiettivo

Aggiungere un backend opzionale a Home App senza eliminare il funzionamento locale.

L'app continua a salvare i dati in `localStorage` e il modulo `cloud-sync.js` aggiunge:

- login tramite Supabase Auth;
- backup manuale su Supabase;
- ripristino da Supabase;
- backup automatico opzionale dopo modifiche locali.

## 1. Crea un progetto Supabase

Crea un nuovo progetto Supabase e recupera:

- Project URL;
- anon public key.

Questi valori andranno inseriti nella sezione `Opzioni > Backup Supabase` dell'app.

## 2. Crea la tabella

Esegui questo SQL nel pannello SQL Editor di Supabase:

```sql
create table if not exists public.home_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.home_backups enable row level security;

drop policy if exists "home_backups_select_own" on public.home_backups;
drop policy if exists "home_backups_insert_own" on public.home_backups;
drop policy if exists "home_backups_update_own" on public.home_backups;
drop policy if exists "home_backups_delete_own" on public.home_backups;

create policy "home_backups_select_own"
on public.home_backups
for select
to authenticated
using (auth.uid() = user_id);

create policy "home_backups_insert_own"
on public.home_backups
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "home_backups_update_own"
on public.home_backups
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "home_backups_delete_own"
on public.home_backups
for delete
to authenticated
using (auth.uid() = user_id);
```

## 3. Crea un utente Auth

In Supabase:

1. vai in `Authentication`;
2. crea un utente con email/password;
3. usa quelle credenziali nell'app.

Il modulo non salva la password nel browser. Salva solo token di sessione Supabase.

## 4. Carica i file nella repository GitHub

Sostituisci nella root della repository:

- `index.html`
- `sw.js`

Aggiungi nella root:

- `cloud-sync.js`
- `SUPABASE_SETUP.md`
- `Home_Wiki.md`

## 5. Dopo il deploy

Apri l'app pubblicata da GitHub Pages e vai in:

`Opzioni > Backup Supabase`

Poi:

1. inserisci Project URL;
2. inserisci anon public key;
3. lascia tabella `home_backups`;
4. salva configurazione;
5. accedi con email/password Supabase;
6. premi `Backup ora`.

## Note tecniche

- Il modulo usa Supabase REST API, non librerie esterne.
- Le chiamate cross-origin verso Supabase non vengono intercettate dal service worker.
- Il file `app.js` resta invariato.
- Google Drive resta invariato e può convivere con Supabase.
