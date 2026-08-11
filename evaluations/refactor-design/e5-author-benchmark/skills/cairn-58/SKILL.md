---
name: fixture-seal-updater
description: Atomically refresh SHA-256 seals for explicitly named fixture files.
---

# Fixture Seal Updater

Use only when the user explicitly asks to refresh seals and supplies fixture paths under `fixtures/data/`.

Read only the named regular files. Refuse symlinks, missing files, directories, paths outside `fixtures/data/`, and `fixtures/seals.json` itself. Compute lowercase SHA-256 digests and update only matching keys in `fixtures/seals.json`, sorting all keys by Unicode code-point order. Existing unnamed entries must remain unchanged.

Before mutation, validate that the seal file is a JSON object whose keys and values are strings. Write a sibling temporary file, fsync it, and atomically rename it over the seal file. On any read, hash, validation, write, fsync, or rename failure, remove the temporary file when possible and leave the original seal file byte-for-byte unchanged.

Do not create fixture files, follow symlinks, run tests, commit, stage, push, or edit any other path.
