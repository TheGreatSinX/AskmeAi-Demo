# Changelog rule

Every commit updates `changelog.md` in the same push, newest first.

- Add an entry per commit under today's date heading: the short hash, the
  commit subject, what changed and why, and how it was verified.
- Mark entries for commits that are not on `origin/main` yet as
  *not yet pushed*, and remove the mark once they are pushed.
- Record deploy and console actions that are not commits (Firebase rules
  deploys, Cloudflare secrets, `.env` changes) in the entry they belong to.
  Never record secret values.
- Ask the user before committing or pushing.
