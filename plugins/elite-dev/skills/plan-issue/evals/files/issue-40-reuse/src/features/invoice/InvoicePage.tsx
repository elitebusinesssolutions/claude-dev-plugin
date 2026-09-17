import type { Invoice } from './types';

export function InvoicePage({ invoice }: { invoice: Invoice }) {
  return (
    <section>
      <h1>Invoice {invoice.number}</h1>
      <ul>
        {invoice.lineItems.map((item) => (
          <li key={item.id}>
            {item.description}
            <span>{item.amount}</span>
          </li>
        ))}
      </ul>
      <p>Total: {invoice.total}</p>
    </section>
  );
}
