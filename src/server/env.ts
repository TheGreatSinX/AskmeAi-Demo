import dotenv from 'dotenv';

/**
 * Loads `.env` exactly once, BEFORE any other server module reads `process.env`.
 *
 * ES module imports are evaluated in import order, before the importing
 * module's own body runs — so `dotenv.config()` written at the top of
 * server.ts would still execute *after* `gemini.ts` / `store.ts` had already
 * read their variables. server.ts therefore imports this file first.
 */
dotenv.config();
