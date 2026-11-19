import { z } from "zod";

// Strict CSP has no 'unsafe-eval': stop Zod probing `new Function` for its JIT
// (the probe is reported as a CSP violation). Import zod from here, not "zod".
z.config({ jitless: true });

export { z };
