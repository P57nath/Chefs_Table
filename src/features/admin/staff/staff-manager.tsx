"use client";

import { KeyRound, Plus, Wand2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { StaffRole } from "@/features/auth/roles";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/time";

import { Field } from "../field";
import { newStaffSchema, type NewStaffInput } from "../schemas";
import { createStaff, resetStaffPassword, updateStaff } from "../server/staff-actions";
import { useRun } from "../use-run";
import { assignableRoles, canManageStaff, temporaryPassword } from "./permissions";

export interface StaffRow {
  userId: string;
  role: StaffRole;
  displayName: string;
  avatarColor: string;
  isActive: boolean;
  email: string;
  lastSignIn: string | null;
}

const selectClass =
  "h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60";

function PasswordField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const t = useTranslations("admin.staff");
  return (
    <Field label={label} hint={t("passwordHint")}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="button" variant="secondary" onClick={() => onChange(temporaryPassword())}>
          <Wand2 aria-hidden />
          {t("generate")}
        </Button>
      </div>
    </Field>
  );
}

function AddStaffForm({ actorRole, onClose }: { actorRole: StaffRole; onClose: () => void }) {
  const t = useTranslations("admin.staff");
  const { run, pending } = useRun();
  const [form, setForm] = useState<NewStaffInput>({
    email: "",
    displayName: "",
    role: "waiter",
    password: temporaryPassword(),
  });
  const valid = newStaffSchema.safeParse(form).success;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          run(() => createStaff(form), {
            success: t("created", { name: form.displayName }),
            onDone: onClose,
          });
      }}
    >
      <Field label={t("email")}>
        <Input
          type="email"
          value={form.email}
          autoFocus
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <Field label={t("name")}>
        <Input
          value={form.displayName}
          maxLength={60}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
      </Field>
      <Field label={t("role")}>
        <select
          className={`${selectClass} w-full`}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
        >
          {assignableRoles(actorRole).map((r) => (
            <option key={r} value={r}>
              {t(`role_${r}`)}
            </option>
          ))}
        </select>
      </Field>
      <PasswordField
        label={t("tempPassword")}
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
      />
      <DialogFooter className="gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ResetForm({ row, onClose }: { row: StaffRow; onClose: () => void }) {
  const t = useTranslations("admin.staff");
  const { run, pending } = useRun();
  const [password, setPassword] = useState(temporaryPassword());
  const valid = newStaffSchema.shape.password.safeParse(password).success;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          run(() => resetStaffPassword({ userId: row.userId, password }), {
            success: t("passwordReset", { name: row.displayName }),
            onDone: onClose,
          });
      }}
    >
      <PasswordField label={t("newPassword")} value={password} onChange={setPassword} />
      <DialogFooter className="gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {t("setPassword")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Add staff, change role, (de)activate, reset password. Owners are owner-only. */
export function StaffManager({
  rows,
  actorRole,
  actorId,
}: {
  rows: StaffRow[];
  actorRole: StaffRole;
  actorId: string;
}) {
  const t = useTranslations("admin.staff");
  const locale = useLocale() as Locale;
  const { run } = useRun();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<StaffRow | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map((r) => {
          const editable = canManageStaff(actorRole, r.role);
          const self = r.userId === actorId;
          return (
            <li
              key={r.userId}
              className="flex flex-wrap items-center gap-3 p-4"
              data-staff={r.email}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full font-semibold text-white"
                style={{ background: r.avatarColor }}
              >
                {[...r.displayName][0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.displayName}{" "}
                  {self ? (
                    <span className="text-sm text-muted-foreground">· {t("you")}</span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {r.email}
                  {r.lastSignIn
                    ? ` · ${t("lastSeen", { date: formatDate(r.lastSignIn, locale) })}`
                    : ""}
                </p>
              </div>
              <select
                className={selectClass}
                aria-label={t("roleFor", { name: r.displayName })}
                value={r.role}
                disabled={!editable || self}
                onChange={(e) =>
                  run(() => updateStaff({ userId: r.userId, role: e.target.value as StaffRole }), {
                    success: t("roleChanged", { name: r.displayName }),
                  })
                }
              >
                {(editable ? assignableRoles(actorRole) : [r.role]).map((role) => (
                  <option key={role} value={role}>
                    {t(`role_${role}`)}
                  </option>
                ))}
              </select>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Switch
                  checked={r.isActive}
                  disabled={!editable || self}
                  aria-label={t("activeFor", { name: r.displayName })}
                  onCheckedChange={(v) =>
                    run(() => updateStaff({ userId: r.userId, isActive: v }), {
                      success: v
                        ? t("activated", { name: r.displayName })
                        : t("deactivated", { name: r.displayName }),
                    })
                  }
                />
                <span className="w-16">{r.isActive ? t("active") : t("inactive")}</span>
              </label>
              <Button
                size="sm"
                variant="ghost"
                disabled={!editable}
                onClick={() => setResetting(r)}
                aria-label={t("resetFor", { name: r.displayName })}
              >
                <KeyRound aria-hidden />
                <span className="hidden sm:inline">{t("reset")}</span>
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>
          {adding ? <AddStaffForm actorRole={actorRole} onClose={() => setAdding(false)} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={resetting !== null} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetTitle", { name: resetting?.displayName ?? "" })}</DialogTitle>
            <DialogDescription>{t("resetHint")}</DialogDescription>
          </DialogHeader>
          {resetting ? <ResetForm row={resetting} onClose={() => setResetting(null)} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
