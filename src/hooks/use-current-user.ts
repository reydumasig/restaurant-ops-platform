"use client";

import { useEffect, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  roleKey: "owner" | "admin" | "commissary_staff" | "branch_manager" | "branch_staff";
  branchId: string | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then(setUser);
  }, []);

  return user;
}
