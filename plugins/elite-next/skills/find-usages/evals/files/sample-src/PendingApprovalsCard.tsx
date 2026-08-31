import { ApprovalBadge } from "./ApprovalBadge";

export function PendingApprovalsCard({ statuses }: { statuses: string[] }) {
  return (
    <div>
      {statuses.map((s, i) => (
        <ApprovalBadge key={i} status={s} />
      ))}
    </div>
  );
}
