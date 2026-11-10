// Worker-only stand-in for iconv-lite (aliased in wrangler.jsonc).
//
// Express 4 loads body-parser -> raw-body -> iconv-lite at startup, and the
// real iconv-lite does not bundle for Cloudflare Workers. The API parses JSON
// itself (src/server/app.ts jsonBody) and only ever handles UTF-8, so this
// shim implements the small surface raw-body touches, for UTF-8 only.
'use strict';

const isUtf8 = (enc) => /^utf-?8$/i.test(String(enc || ''));

function unsupported(enc) {
  const err = new Error(`Encoding not supported in this runtime: ${enc}`);
  err.type = 'encoding.unsupported';
  err.status = 415;
  return err;
}

module.exports = {
  encodingExists: isUtf8,
  getDecoder(enc) {
    if (!isUtf8(enc)) throw unsupported(enc);
    const decoder = new TextDecoder('utf-8');
    return {
      write: (chunk) => decoder.decode(chunk, { stream: true }),
      end: () => decoder.decode(),
    };
  },
  decode(buf, enc) {
    if (!isUtf8(enc)) throw unsupported(enc);
    return new TextDecoder('utf-8').decode(buf);
  },
  encode(str, enc) {
    if (!isUtf8(enc)) throw unsupported(enc);
    return new TextEncoder().encode(String(str));
  },
};
