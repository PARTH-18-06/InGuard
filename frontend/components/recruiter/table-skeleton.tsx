import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className="grid gap-3"
          key={`row-${rowIndex}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              className="h-10"
              key={`cell-${rowIndex}-${columnIndex}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
