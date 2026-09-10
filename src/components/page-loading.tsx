import { Spinner } from "@/components/ui/spinner";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Spinner />
      {label}
    </div>
  );
}
