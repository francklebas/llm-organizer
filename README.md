# AI Conversation Organizer

Extension Firefox local-first pour organiser des conversations ChatGPT (puis Claude/Gemini) dans
un workspace personnel — dossiers, tags, favoris, recherche — indépendant du provider, du
navigateur ou de l'OS.

## Principe

> The extension organizes references to AI conversations; it does not collect or store the
> conversations themselves.

L'extension ne lit, ne stocke et ne synchronise jamais le contenu des messages. Elle ne conserve
que `provider`, `externalId`, `url`, et un `title` best-effort (jamais critique). Voir
`src/providers/core/types.ts` (`ConversationReference`).

- **IndexedDB (Dexie)** est le datastore local requis — l'extension fonctionne intégralement sans
  compte ni réseau (dossiers, tags, favoris, recherche, export/import).
- **Supabase** est une synchronisation cloud strictement optionnelle (auth, multi-device, backup),
  jamais une dépendance du fonctionnement local, et ne reçoit que des métadonnées d'organisation
  (jamais le contenu des conversations).

## Permissions Firefox (`public/manifest.json`)

| Permission                                       | Raison                                                                                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                        | Persister la session Supabase Auth via `browser.storage.local` (opt-in, cloud sync uniquement).                                                                                  |
| `alarms`                                         | Déclencher le cycle de synchronisation en arrière-plan à intervalle raisonnable, sans polling agressif.                                                                          |
| `host_permissions: chatgpt.com, chat.openai.com` | Domaines du seul provider supporté au MVP, pour l'injection du content script de détection. Étendu uniquement quand un provider est réellement implémenté — jamais `<all_urls>`. |

Le content script (`src/content/chatgpt.ts`) lit uniquement l'URL courante et, en best-effort, un
sélecteur DOM pour le titre — jamais le contenu des messages.

## Scripts

```bash
npm run dev         # sidebar en mode dev (navigateur classique, hors extension)
npm run build        # build complet (sidebar + background + content scripts) dans dist/
npm run typecheck
npm run lint
npm run test
```

## Structure

Voir `src/` : `background/`, `content/`, `sidebar/`, `providers/` (core + un dossier par provider),
`db/` (Dexie + repositories), `sync/` (queue, conflict, engine), `supabase/`, `domain/`.
