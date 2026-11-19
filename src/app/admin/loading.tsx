import { SkeletonBlock, SkeletonList } from "@/components/states/skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-9 w-56" />
      <SkeletonList label="Loading" />
    </div>
  );
}
