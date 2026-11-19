import { SkeletonBlock, SkeletonMenuItem } from "@/components/states/skeletons";

/** Mirrors the menu layout so nothing shifts when it streams in. */
export default function GuestLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-dvh bg-background">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-5">
        <SkeletonBlock className="h-6 w-40" />
        <div className="flex gap-3 overflow-hidden">
          <SkeletonBlock className="aspect-[4/3] w-60 shrink-0 rounded-2xl" />
          <SkeletonBlock className="aspect-[4/3] w-60 shrink-0 rounded-2xl" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonMenuItem key={i} />
        ))}
      </div>
    </div>
  );
}
