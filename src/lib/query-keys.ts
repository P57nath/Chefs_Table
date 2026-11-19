/** Single source of TanStack Query keys (docs/02-ARCHITECTURE.md §5). */
export const qk = {
  menu: (restaurantId: string) => ["menu", restaurantId] as const,
  guestJoin: (token: string) => ["guest-join", token] as const,
  /** Prefix of every per-session key: invalidating it refreshes the whole guest screen. */
  session: (sessionId: string) => ["session", sessionId] as const,
  sessionStatus: (sessionId: string) => ["session", sessionId, "status"] as const,
  sessionOrders: (sessionId: string) => ["session", sessionId, "orders"] as const,
  sessionRequests: (sessionId: string) => ["session", sessionId, "requests"] as const,
  bill: (sessionId: string) => ["session", sessionId, "bill"] as const,
  sessionPayments: (sessionId: string) => ["session", sessionId, "payments"] as const,
  payment: (sessionId: string, tranId: string) =>
    ["session", sessionId, "payments", tranId] as const,
  feedback: (sessionId: string) => ["session", sessionId, "feedback"] as const,
  /** Prefix of every staff-side key (realtime on the floor channel invalidates it). */
  staff: () => ["staff"] as const,
  staffOrders: () => ["staff", "orders"] as const,
  staffRequests: () => ["staff", "requests"] as const,
  staffMenu: () => ["staff", "menu"] as const,
  floor: () => ["staff", "floor"] as const,
  kitchen: () => ["kitchen"] as const,
} as const;

/** Everything a guest screen depends on, for reconnect / focus refetches. */
export const guestKeys = (sessionId: string, restaurantId: string) => [
  qk.session(sessionId),
  qk.menu(restaurantId),
];
