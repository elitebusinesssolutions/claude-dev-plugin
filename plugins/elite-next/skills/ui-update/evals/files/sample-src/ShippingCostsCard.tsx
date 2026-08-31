export function ShippingCostsCard({ status }: { status: string }) {
  return (
    <div>
      <label className="bg-amber-500/20 text-amber-700 rounded px-2">{status}</label>
    </div>
  );
}
