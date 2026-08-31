"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

interface Crew {
  id: string;
  name: string;
  active: boolean;
}

export function SampleComponent() {
  const [crew, setCrew] = useState<Crew[]>([]);

  useEffect(() => {
    apiClient
      .GET("/api/crew", { params: { query: { active: true } } })
      .then(({ data }) => {
        if (data) setCrew(data);
      })
      .catch(() => {});
  }, []);

  async function deactivate(id: string) {
    await apiClient.PUT("/api/crew/{id}", {
      params: { path: { id } },
      body: { active: false }
    });
  }

  return (
    <ul>
      {crew.map((c) => (
        <li key={c.id}>
          {c.name}
          <button onClick={() => deactivate(c.id)}>Deactivate</button>
        </li>
      ))}
    </ul>
  );
}
