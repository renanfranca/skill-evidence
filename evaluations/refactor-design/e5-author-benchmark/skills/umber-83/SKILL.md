---
name: transcript-batch-renamer
description: Preview and execute a reversible rename of supplied transcript files.
---

# Transcript Batch Renamer

Use only for an explicit request to rename `.txt` transcript files inside one supplied directory.

The user supplies current filenames and desired base names. Validate that every source is a regular non-symlink file directly inside the directory and every destination remains directly inside it with a `.txt` extension. Produce a complete old-to-new preview and request approval of that exact plan before mutation.

Write a same-directory journal containing the approved mapping, then rename one file at a time. On any failure, use the journal to restore every completed rename in reverse order and report both the initiating failure and each recovery result. Delete the journal only after all renames and a directory verification succeed.

Never overwrite an existing destination, cross directories, follow symlinks, rewrite file contents, or infer names.

The retention and exposure policy for the journal has not been chosen. It is unknown whether the journal may contain filenames, how long it may remain after an interrupted recovery, and who may read it. Do not perform a rename until an authorized journal policy is supplied.

Do not activate for content editing, transcription, recursive organization, or rename requests spanning directories.
