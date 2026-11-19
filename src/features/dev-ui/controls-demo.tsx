"use client";

import { Flame, LayoutGrid, List, Map as MapIcon, Leaf } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Chip } from "@/components/common/chip";
import { SegmentedControl } from "@/components/common/segmented-control";
import { SlideToConfirm } from "@/components/common/slide-to-confirm";
import { Stepper } from "@/components/common/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { Row, Section } from "./section";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ControlsDemo() {
  const t = useTranslations("controls");
  const [qty, setQty] = useState(2);
  const [view, setView] = useState<"3d" | "2d" | "list">("3d");
  const [category, setCategory] = useState("biryani");
  const [veg, setVeg] = useState(false);
  const [note, setNote] = useState("");
  const [attempt, setAttempt] = useState(0);

  return (
    <Section title="Controls">
      <Row label="Chips">
        {["starters", "biryani", "grill", "drinks"].map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c[0]?.toUpperCase()}
            {c.slice(1)}
          </Chip>
        ))}
        <Chip active={veg} onClick={() => setVeg((v) => !v)} icon={<Leaf aria-hidden />} size="sm">
          Veg only
        </Chip>
        <Chip size="sm" icon={<Flame aria-hidden />}>
          Spice ≤ 2
        </Chip>
      </Row>
      <Row label="Stepper & segmented">
        <Stepper value={qty} onChange={setQty} itemName="Mango Lassi" />
        <Stepper value={qty} onChange={setQty} size="sm" />
        <SegmentedControl
          label="Floor view"
          value={view}
          onChange={setView}
          options={[
            { value: "3d", label: "3D", icon: <LayoutGrid aria-hidden /> },
            { value: "2d", label: "2D", icon: <MapIcon aria-hidden /> },
            { value: "list", label: "List", icon: <List aria-hidden /> },
          ]}
        />
      </Row>
      <Row label="Form controls">
        <div className="flex items-center gap-3">
          <Switch id="dev-sound" defaultChecked />
          <Label htmlFor="dev-sound">Sound</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="dev-cheese" defaultChecked />
          <Label htmlFor="dev-cheese">Cheddar cheese (+৳60)</Label>
        </div>
        <RadioGroup defaultValue="single" className="flex gap-4">
          {["single", "double"].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem id={`dev-${v}`} value={v} />
              <Label htmlFor={`dev-${v}`}>{v}</Label>
            </div>
          ))}
        </RadioGroup>
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search the menu" aria-label="Search the menu" />
        <div className="space-y-1">
          <Textarea
            aria-label="Special instructions"
            placeholder="Special instructions (e.g. no onion)"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">{note.length}/200</p>
        </div>
      </div>
      <Row label="Slide to confirm (2nd attempt fails to show reset)">
        <div className="w-full max-w-sm">
          <SlideToConfirm
            key={attempt}
            label={t("slideToPlace")}
            pendingLabel="Placing order…"
            doneLabel={t("confirmed")}
            onConfirm={async () => {
              await wait(1200);
              setTimeout(() => setAttempt((a) => a + 1), 1500);
              if (attempt % 2 === 1) throw new Error("demo failure");
            }}
          />
        </div>
      </Row>
    </Section>
  );
}
