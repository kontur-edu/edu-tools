import React from "react";
import { useGoogleAuthStore } from "../../stores/GoogleAuthStore";

export function ShowIfGoogleAuth({ is, children }: { is: boolean; children: React.ReactNode }) {
  const { isAuthenticated } = useGoogleAuthStore()

  if (isAuthenticated === is) {
    return <>{children}</>
  }

  return null
}
