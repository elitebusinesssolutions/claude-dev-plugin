export function ApprovalBadge({ status }: { status: string }) {
  return <span className="bg-amber-500/20 text-amber-700 rounded px-2">{status}</span>;
}
