import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MoneyText } from "@/components/common/money-text";
import { SegmentedControl } from "@/components/common/segmented-control";
import { SlideToConfirm } from "@/components/common/slide-to-confirm";
import { StatusPill } from "@/components/common/status-pill";
import { Stepper } from "@/components/common/stepper";
import { Button } from "@/components/ui/button";

import { renderWithIntl } from "./render";

function ControlledStepper({
  initial = 1,
  onChange,
}: {
  initial?: number;
  onChange?: (n: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Stepper
      value={value}
      onChange={(n) => {
        setValue(n);
        onChange?.(n);
      }}
      min={1}
      max={3}
      itemName="Mango Lassi"
    />
  );
}

describe("Stepper", () => {
  it("is labelled and respects min/max", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ControlledStepper />);
    expect(screen.getByRole("group", { name: "Quantity of Mango Lassi" })).toBeInTheDocument();
    const dec = screen.getByRole("button", { name: "Decrease quantity" });
    const inc = screen.getByRole("button", { name: "Increase quantity" });
    expect(dec).toBeDisabled();
    await user.click(inc);
    await user.click(inc);
    expect(inc).toBeDisabled();
    expect(dec).toBeEnabled();
  });
});

describe("SlideToConfirm", () => {
  it("confirms from the keyboard (intentional activation)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(<SlideToConfirm label="Slide to place order" onConfirm={onConfirm} />);
    screen.getByRole("button", { name: "Slide to place order" }).focus();
    await user.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("ignores a plain mouse click (prevents accidental orders)", () => {
    const onConfirm = vi.fn();
    renderWithIntl(<SlideToConfirm label="Slide to place order" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Slide to place order" }), { detail: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not fire twice while pending (double activation)", async () => {
    let resolve: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    renderWithIntl(<SlideToConfirm label="Slide to place order" onConfirm={onConfirm} />);
    const handle = screen.getByRole("button", { name: "Slide to place order" });
    fireEvent.click(handle, { detail: 0 });
    fireEvent.click(handle, { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });

  it("resets after a failure so the user can retry", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(undefined);
    renderWithIntl(<SlideToConfirm label="Slide to place order" onConfirm={onConfirm} />);
    const handle = screen.getByRole("button", { name: "Slide to place order" });
    await act(async () => fireEvent.click(handle, { detail: 0 }));
    await act(async () => fireEvent.click(handle, { detail: 0 }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});

describe("SegmentedControl", () => {
  it("moves selection with arrow keys (roving tabindex)", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [v, setV] = useState<"a" | "b" | "c">("a");
      return (
        <SegmentedControl
          label="View"
          value={v}
          onChange={setV}
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C" },
          ]}
        />
      );
    }
    renderWithIntl(<Demo />);
    screen.getByRole("radio", { name: "A" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "C" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("StatusPill & MoneyText", () => {
  it("renders translated labels", () => {
    renderWithIntl(<StatusPill kind="table" state="call_waiter" />, { locale: "bn" });
    expect(screen.getByText("ওয়েটার ডাকছেন")).toBeInTheDocument();
  });

  it("formats money per locale with an exact machine value", () => {
    renderWithIntl(<MoneyText minor={123450} />, { locale: "bn" });
    const el = screen.getByText("৳১,২৩৪.৫০");
    expect(el).toHaveAttribute("value", "1234.50");
  });
});

describe("Button", () => {
  it("keeps its label in the layout and is disabled while loading", () => {
    renderWithIntl(<Button loading>Confirm & send</Button>);
    const button = screen.getByRole("button", { name: "Confirm & send" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
