export function colorFor(status: string) {
  if (status === "pending") return "bg-amber-500/20 text-amber-700";
  return "bg-slate-500/20 text-slate-700";
}
