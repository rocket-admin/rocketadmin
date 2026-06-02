import { createGuardrails } from 'otplib';

// otplib v13 enforces RFC 4226's 128-bit (16-byte) minimum secret length, but
// users enrolled before the v12 -> v13 upgrade have 10-byte secrets stored
// (the v12 `authenticator.generateSecret()` default). Relax the guardrail at
// verify time so those users can still authenticate. New secrets use v13's
// 20-byte default and are RFC-compliant.
export const legacyOtpGuardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
