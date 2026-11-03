# Password Manager — Frontend

Zero-knowledge password manager. One Vue 3 codebase, three platforms: web, desktop (Tauri), browser extension (Chrome MV3).

Server never sees your master password or decrypted data.

## Platforms

| Platform  | Command                 | Runs on                                        |
| --------- | ----------------------- | ---------------------------------------------- |
| Web       | `npm run dev`           | `http://localhost:5173`                        |
| Desktop   | `npm run tauri dev`     | Native window (Tauri v2)                       |
| Extension | `npm run dev:extension` | `chrome://extensions` → load `dist-extension/` |

Each platform shares `src/` (crypto, api, db, views). Platform-specific code lives in `src/platform/` and `src/extension/`.

## Stack

- **Vue 3** (Composition API) + TypeScript
- **Pinia** + **Vue Router**
- **Axios** + **Zod** (API validation)
- **Tailwind CSS** v4 + **SCSS**
- **Dexie** (IndexedDB)
- **libsodium-wrappers** (XChaCha20-Poly1305) + WebCrypto (AES-256-GCM)
- **hash-wasm** (Argon2id)
- **zxcvbn-ts** (password strength)
- **Tauri v2** (desktop)
- **CRXJS** (extension)

## Setup

```bash
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8080

# Backend must be running:
# cd ../password-manager-backend && air
```

## Dev

```bash
npm run dev              # web
npm run tauri dev        # desktop
npm run dev:extension    # extension (HMR on :5174)
```

### Load extension in Chrome

1. `chrome://extensions` → enable Developer mode
2. **Load unpacked** → select `dist-extension/`
3. Reload the card after each rebuild (or use `dev:extension` for HMR)

## Build

```bash
npm run build              # web → dist/
npm run tauri build        # desktop → src-tauri/target/release/bundle/
npm run build:extension    # extension → dist-extension/
```

## Structure

```
src/
├── api/              Axios clients + DTOs
├── crypto/           Argon2id, AES-GCM, HKDF, session key
│   ├── argon2.worker.ts  Web Worker for Argon2
│   └── argon2-sync.ts    Synchronous version for extension SW
├── db/               Dexie schema + repositories
├── platform/         Platform abstractions
│   ├── env.ts            isTauri() / isExtension() / isCapacitor()
│   ├── device.ts         device_id, device name
│   ├── storage.*.ts      Secure storage per platform
│   └── session-settings  auto-lock, remember device
├── services/
│   ├── sync.ts           Push/pull engine
│   └── websocket.ts      Real-time notifications
├── stores/           Pinia stores (auth, vault, theme, toast)
├── views/            Web/Tauri views
├── components/       Shared components
├── extension/        Browser extension
│   ├── background/       Service worker (API + crypto + state)
│   ├── content/          Autofill on pages
│   ├── popup/            Compact Vue app
│   └── shared/           Typed messages
└── styles/
    ├── tailwind.css      @import "tailwindcss"
    └── main.scss         SCSS variables + custom styles
```

## Security model

**Client-side crypto**

- `master_key = Argon2id(master_password, enc_salt)`
- `account_key` — random 32 bytes, wrapped with `master_key`
- Each item encrypted with `HKDF(account_key, item_id)`

**Key storage per platform**

| Platform  | `account_key`                        | Refresh token                         |
| --------- | ------------------------------------ | ------------------------------------- |
| Web       | In-memory tab (lost on reload)       | `localStorage` (if "remember device") |
| Desktop   | In-memory + OS keychain (optional)   | OS keychain / `localStorage`          |
| Extension | `chrome.storage.session` (in-memory) | `chrome.storage.local`                |

`account_key` is **never** written to disk in plaintext.

## Extension architecture

```
Popup ──chrome.runtime.sendMessage──▶ Service Worker ──fetch──▶ Backend
Content script ─────────────────────────┘
```

- SW is the only place with `account_key` and tokens
- Popup derives keys, sends `account_key` to SW, SW persists to `storage.session`
- Content script asks SW for credentials by URL, fills fields via native events
- Standalone: no Tauri required

## Related

- Backend: [password-manager-backend](https://github.com/MattKenyei/password-manager-backend)
- API docs: [docs/API.md](docs/API.md)
