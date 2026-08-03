"use client";

import { useEffect, useState } from "react";

type Branch = { id: string; name: string; code: string; type: "commissary" | "branch" };

export function useBranchSelector() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/branches-for-user")
      .then((res) => res.json())
      .then((data: Branch[]) => {
        setBranches(data);
        setBranchId(data[0]?.id ?? "");
        setLoading(false);
      });
  }, []);

  return { branches, branchId, setBranchId, loading };
}
