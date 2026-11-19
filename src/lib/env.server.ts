import "server-only";

import { parseServerEnv, type ServerEnv } from "./env-schema";

export type { ServerEnv } from "./env-schema";

/** Server-only environment, validated once at module load (fails fast on boot). */
export const serverEnv: ServerEnv = parseServerEnv(process.env);
