import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { badgeToneMap } from "@/components/recruiter/utils";
import type { JobStatus, SessionStatus } from "@/components/recruiter/types";

export function StatusBadge({
  value,
}: {
  value: JobStatus | SessionStatus;
}) {
  return (
    <Badge
      className={cn("capitalize", badgeToneMap[value])}
      variant="outline"
    >
      {value}
    </Badge>
  );
}
