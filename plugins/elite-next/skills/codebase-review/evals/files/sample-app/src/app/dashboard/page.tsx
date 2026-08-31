"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

export function Dashboard({ isAdmin }: { isAdmin: boolean }) {
  const [quotes, setQuotes] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .GET("/api/quotes")
      .then(({ data }) => {
        if (data) setQuotes(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      {isAdmin && <button>Delete all quotes</button>}
      {quotes.map((q, i) => (
        <div key={i}>{q.total_cents}</div>
      ))}
    </div>
  );
}
