# VaultX (UNDER DEVELOPMENT)

VaultX — Secure Offline Presidential Vault  
**A hardened, offline-first secure journal built with Expo (React Native).**  
Designed for storing extremely sensitive notes where privacy, auditable integrity, and controlled destruction (panic wipe) are required.

---

## Overview

VaultX provides:

- AES-256-CBC encryption for content with HMAC-SHA256 integrity checks.
- A randomly-generated master key (256-bit) wrapped with a PBKDF2-derived key from your passphrase and stored in device SecureStore.
- Append-only entries (no in-app deletion). Only an explicit, confirmed **Panic Wipe** securely overwrites and removes data.
- Optional biometric gating (fingerprint / Face ID).
- Screen capture disabled while unlocked (where supported).
- Offline-only design — **no network requests, telemetry, or external APIs**.
- Tamper log / audit view so the user (or auditor) can verify the vault state and operations.

VaultX focuses on transparency and realism: what the UI shows is real cryptographic state (hashes, HMAC previews, timestamps), not fake animations.

---

## Features (key highlights)

- **Strong encryption**: AES-256-CBC for entry encryption + HMAC-SHA256 for integrity.
- **Key management**: Master key generated via secure RNG and wrapped by a PBKDF2-derived key (PBKDF2 with SHA-256, high iteration count).
- **Biometric gating**: Optional; still requires passphrase for decryption (defense-in-depth).
- **Append-only storage**: Entries are appended; in-app deletion is disallowed. Tamper log tracks unlocks, integrity checks, and critical operations.
- **Panic Wipe**: Multi-pass overwrite of stored data (in JS-land best-effort), removal of SecureStore keys and AsyncStorage entries, plus memory scrubbing of in-memory keys.
- **Screen-capture prevention**: Disable screenshots when the vault is unlocked (platform-specific).
- **No network surface**: Designed to be shipped without INTERNET permission and to run fully offline.
- **Auditability**: UI exposes truncated salts, HMACs, timestamps, and tamper-log entries so a user or auditor can quickly verify state.
- **Minimal, professional terminal-style UI**: Low animation, high clarity, tense-proof.

---

## Quick start (dev)

1. Clone repo:
   ```bash
   git clone https://github.com/ArnabMistry/vaultx-secure-journal.git
   cd vaultx-secure-journal
   ```

2. Install:
   ```bash
   yarn
   ```

3. Start dev:
   ```bash
   npx expo start
   ```

**Important (production)** — to remove any chance of network access and to ensure control over native permissions, build a custom native binary (recommended):
```bash
eas build --platform android
# or
expo run:android
```

Ensure AndroidManifest does not include `android.permission.INTERNET` (set `android.permissions: []` in app.json/eas.json) and verify final manifest. On iOS, verify entitlements and info.plist for no unnecessary network entitlements.

## Recommended dependencies

- expo (managed workflow)
- expo-crypto — secure random bytes & cryptographic primitives where appropriate
- expo-secure-store — storage of wrapped master key metadata
- expo-local-authentication — biometric support
- @react-native-async-storage/async-storage — encrypted ciphertext/tamperlog storage (local)
- crypto-js — PBKDF2, AES (WordArray interoperable), HMAC (used carefully)

Install:
```bash
npx expo install expo-crypto expo-secure-store expo-local-authentication
npm install @react-native-async-storage/async-storage crypto-js
```

## File structure (Under DEVELOPMENT)

```bash
/src
  /components
    Button.js
    EntryCard.js
    Header.js
    Modals.js
  crypto.js          # crypto helpers (PBKDF2, AES encrypt/decrypt, HMAC)
  storage.js         # AsyncStorage / SecureStore helpers
  panicWipe.js       # panic-wipe helpers & verification steps
  audit.js           # audit builder and export helpers
  App.js             # main app / router
  styles.js          # shared styles and theme
README.md
LICENSE
```

## Security notes & operational guidance

- **Passphrase**: Use a long, high-entropy passphrase (min 12 chars, recommended 16+; use passphrase managers or offline paper backups).
- **Device hardness**: The app assumes the OS/hardware is trusted. If device is compromised (rooted/jailbroken), secrecy can't be guaranteed.
- **Air-gapped use**: For highest assurance, use on an air-gapped device (no Wi-Fi/cellular) and ensure the final build has no INTERNET permission.
- **Hardware-backed keys**: Where possible, utilize hardware-backed Secure Enclave / Keystore (device-provided) for SecureStore keys.
- **No cloud backups**: Do not enable automatic backups of the app's storage — those can leak encrypted material or metadata. Configure build so that backups are disabled for the vault data.
- **Panic wipe caveats**: JavaScript overwrite cannot guarantee physical disk overwrites on flash storage (wear-leveling). Panic Wipe is the best-effort deletion strategy; for top-tier destruction consider physical measures or secure device management.

## Audit & transparency UI

VaultX intentionally exposes limited cryptographic state to build trust:
- truncated salt & iterations used for PBKDF2
- entry HMAC truncated preview (not full ciphertext)
- tamper log with timestamped events (unlock, integrity_check, entry_added, entry_viewed, locked, panic_wipe)
- last verified timestamp & result

This information helps an auditor or an executive quickly confirm the vault's integrity without revealing plaintext.

## Contributing

1. Fork the repo.
2. Create a feature branch.
3. Open a PR with a clear security rationale for any cryptographic change.
4. All changes to crypto code must include unit tests and a security rationale doc in `/docs/security/`.

## Disclaimer

VaultX is a security-focused template. Use it at your own risk. For governmental or top-secret usage, a formal security review, hardware assurances, and legal procedures must be followed. The author provides no warranty or guarantee.

## 📜 License

Copyright 2025 Arnab Mistry

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
