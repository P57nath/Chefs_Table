"use client";

import { useState } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { Timer } from "@/components/common/timer";
import { ORDER_STATUSES, TABLE_STATES } from "@/lib/status";

import { Row, Section } from "./section";

export function StatusDemo() {
  // Fixed once per mount so timers tick from stable starting points.
  const [base] = useState(() => Date.now());

  return (
    <Section title="Status & timers">
      <Row label="Table states">
        {TABLE_STATES.map((s) => (
          <StatusPill key={s} kind="table" state={s} />
        ))}
      </Row>
      <Row label="Order statuses">
        {ORDER_STATUSES.map((s) => (
          <StatusPill key={s} kind="order" state={s} size="sm" />
        ))}
      </Row>
      <Row label="With age timer">
        <StatusPill kind="table" state="new_order">
          <Timer since={new Date(base - 102_000)} toned={false} />
        </StatusPill>
        <StatusPill kind="table" state="call_waiter" size="lg">
          <Timer since={new Date(base - 45_000)} toned={false} />
        </StatusPill>
      </Row>
      <Row label="KDS timers (green < 10 min, amber < 20, red ≥ 20)">
        <Timer since={new Date(base - 4 * 60_000)} className="text-3xl font-medium" />
        <Timer since={new Date(base - 12 * 60_000)} className="text-3xl font-medium" />
        <Timer since={new Date(base - 26 * 60_000)} className="text-3xl font-medium" />
      </Row>
    </Section>
  );
}
