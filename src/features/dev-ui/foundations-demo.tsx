import { Bell, Plus, Trash2 } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { IconButton } from "@/components/common/icon-button";
import { MoneyText } from "@/components/common/money-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { formatMoney } from "@/lib/money";

import { Row, Section } from "./section";

const SWATCHES = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["primary", "bg-primary"],
  ["ember", "bg-ember"],
  ["success", "bg-success"],
  ["info", "bg-info"],
  ["violet", "bg-violet"],
  ["cooking", "bg-cooking"],
  ["eating", "bg-eating"],
  ["free", "bg-free"],
  ["seated", "bg-seated"],
] as const;

export function FoundationsDemo() {
  return (
    <>
      <Section title="Brand & type">
        <Logo name={brand.name} className="text-2xl" />
        <div className="space-y-2">
          <p className="font-display text-[3.25rem] leading-none font-semibold">
            Ember Smash Burger
          </p>
          <p className="font-display text-2xl font-semibold" lang="bn">
            এম্বার স্ম্যাশ বার্গার
          </p>
          <p className="max-w-prose text-base">
            Body text in Inter — short, warm, human. Your order is on its way to the kitchen.
          </p>
          <p className="max-w-prose text-base" lang="bn">
            আপনার অর্ডার কিচেনের পথে। খাবার তৈরি হলেই আমরা জানিয়ে দেব।
          </p>
          <p className="text-muted-foreground">Muted secondary text for hints and metadata.</p>
          <p className="text-2xl font-semibold tabular-nums">
            <MoneyText minor={123400} /> · <MoneyText minor={78343} />
          </p>
          <p className="text-2xl font-semibold tabular-nums" lang="bn">
            {formatMoney(123400, "bn")} · {formatMoney(78343, "bn")}
          </p>
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-14 rounded-xl border border-border ${cls}`} />
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Row label="Variants">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="destructive-soft">Reject</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="Sizes & states">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">
            <Plus aria-hidden /> Add · <MoneyText minor={78000} />
          </Button>
          <Button loading>Confirm & send</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="Icon buttons">
          <IconButton label="Notifications">
            <Bell aria-hidden />
          </IconButton>
          <IconButton label="Add" variant="default">
            <Plus aria-hidden />
          </IconButton>
          <IconButton label="Remove" variant="destructive-soft" size="icon-sm">
            <Trash2 aria-hidden />
          </IconButton>
        </Row>
        <Row label="Badges">
          <Badge>New</Badge>
          <Badge variant="secondary">Bestseller</Badge>
          <Badge variant="outline">🌿 Veg</Badge>
          <Badge variant="destructive">🌶🌶 Spicy</Badge>
        </Row>
      </Section>
    </>
  );
}
