import React from "react";
import { useGoogleStore } from "../../stores/GoogleStore";

export function ShowIfGoogleAuth({ is, children }: { is: boolean; children: React.ReactNode }) {
  const { isAuthenticated } = useGoogleStore()

  if (isAuthenticated === is) {
    return <>{children}</>
  }

  return null
}
