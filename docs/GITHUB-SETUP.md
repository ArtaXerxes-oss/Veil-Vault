# GitHub setup for Wave 2 submission

Required by Official Rules: `midnightntwrk` label + Apache-2.0 + repo + slide deck + video.

## 1. Topics (cannot be set by file — do in UI once)
Repo → About (gear) → Topics → add:
`midnightntwrk`, `midnight`, `compact`, `zero-knowledge`, `privacy`

Or via CLI (maintainer logged in):
```bash
gh repo edit ArtaXerxes-oss/Veil-Vault --add-topic midnightntwrk,midnight,compact,zero-knowledge,privacy
```

Verify: repo About must show `midnightntwrk`.

## 2. License
`LICENSE` = Apache-2.0, `package.json: license=Apache-2.0`. Do not remove.

## 3. AKINDO Wave 2 submission
Submit by Wave 2 build deadline `Oct 3, 2026`:
- GitHub repo URL
- `docs/slide-deck.md`
- Video `https://youtu.be/dyCqXgBnkgE`
Only the submitted commit is judged for that Wave.
