// Similar-looking but unrelated — should NOT be counted as a usage of ApprovalBadge.
export function StatusChip({ status }: { status: string }) {
  return <span className="chip">{status}</span>;
}
