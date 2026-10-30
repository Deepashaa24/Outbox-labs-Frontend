import { Badge } from "../../components/ui/Badge";
import type { EmailJobStatus } from "../../types";

const statusPresentation: Record<EmailJobStatus, { label: string; tone: "info" | "warning" | "success" | "danger" }> = {
  SCHEDULED: { label: "Scheduled", tone: "info" },
  PROCESSING: { label: "Sending", tone: "warning" },
  SENT: { label: "Sent", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" }
};

export function EmailStatusBadge({ status }: { status: EmailJobStatus }) {
  const presentation = statusPresentation[status];
  return <Badge tone={presentation.tone}>{presentation.label}</Badge>;
}
