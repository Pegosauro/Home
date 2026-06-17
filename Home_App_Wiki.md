# Home App Wiki

## Versione 2.9.3 - Sezione Procedura progetti

### Modifiche lato UI
- Aggiunta la sezione **Procedura** nella pagina dettaglio dei progetti.
- Aggiunto il campo **Procedura** nel popup **Nuovo progetto / Modifica progetto**.
- Il campo Procedura è libero e non ha limite `maxlength`.
- Il testo della procedura mantiene gli a capo nella visualizzazione del dettaglio.

### Modifiche lato codice
- Aggiunto il campo `procedure` al modello dati dei progetti.
- Aggiornata la normalizzazione dei dati per mantenere `idea.procedure` anche sui dati esistenti.
- Aggiornato il salvataggio dei progetti per leggere, creare e modificare la procedura.
- Aggiunto helper `procedureSectionHtml()` per renderizzare la sezione Procedura.
- Aggiornata la versione app a `2.9.3`.
- Aggiornata la cache del Service Worker a `casa-app-2.9.3`.

### Note operative
- I progetti già esistenti restano compatibili: se non hanno una procedura, il campo viene inizializzato come stringa vuota.
- La descrizione resta separata dalla procedura: la descrizione rimane un riepilogo breve, la procedura contiene istruzioni complete e testo lungo.

## Versione 2.9.4 - Procedura con editor tipo Notion base

### Modifiche lato UI
- La sezione **Procedura** dei progetti diventa un editor a blocchi.
- Aggiunti blocchi: testo, titolo, checklist, nota ed elenco.
- Aggiunti pulsanti rapidi `+ Testo`, `+ Titolo`, `+ Checklist`, `+ Nota`.
- Aggiunto campo comando con supporto base a `/titolo`, `/checklist`, `/nota`, `/elenco` e `/testo`.
- Ogni blocco può essere cambiato di tipo, spostato su/giù o eliminato.
- Le checklist della procedura supportano aggiunta, completamento, modifica ed eliminazione delle voci.

### Modifiche lato codice
- Aggiunto il campo strutturato `idea.procedureBlocks`.
- Mantenuto il campo `idea.procedure` come testo compatibile generato dai blocchi.
- Aggiunta normalizzazione dei blocchi procedura per import, backup e dati esistenti.
- Aggiunti helper di rendering e gestione: `procedureEditorHtml`, `procedureBlockHtml`, `parseProcedureCommand`, `touchProcedure`.
- Aggiunti listener `input` e `change` per salvataggio inline dei blocchi.
- Aggiornata la versione app a `2.9.4`.
- Aggiornata la cache del Service Worker a `casa-app-2.9.4`.
