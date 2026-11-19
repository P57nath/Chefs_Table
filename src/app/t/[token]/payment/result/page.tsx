import { PaymentResultScreen } from "@/features/guest/bill/payment-result-screen";

const STATUSES = new Set(["success", "fail", "cancel"] as const);
type Hint = "success" | "fail" | "cancel";

/** Where the gateway return route sends the guest (docs/02 §7). */
export default async function PaymentResultPage({
  searchParams,
}: PageProps<"/t/[token]/payment/result">) {
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "";
  const status: Hint = STATUSES.has(raw as Hint) ? (raw as Hint) : "fail";
  const tran = typeof sp.tran === "string" && /^ES-[0-9A-F]{20}$/.test(sp.tran) ? sp.tran : null;
  return <PaymentResultScreen status={status} tran={tran} />;
}
