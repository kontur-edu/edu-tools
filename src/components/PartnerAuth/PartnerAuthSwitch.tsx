import { useEffect } from "react"
import { usePartnerStore } from "../../stores/PartnerStore"
import { FormControlLabel, Switch } from "@mui/material"
import React from "react"

export function PartnerAuthSwitch() {
  const isLoggedIn = usePartnerStore((state) => state.currentAuth !== null)
  const isLoggingIn = usePartnerStore((state) => state.isLoggingIn)
  const isLoggingOut = usePartnerStore((state) => state.isLoggingOut)
  const runAutoEnsureAuth = usePartnerStore((state) => state.runAutoEnsureAuth)
  const stopAutoEnsureAuth = usePartnerStore((state) => state.stopAutoEnsureAuth)
  const startLoginAsync = usePartnerStore((state) => state.startLoginAsync)
  const startLogoutAsync = usePartnerStore((state) => state.startLogoutAsync)

  const disabled = isLoggingIn || isLoggingOut

  useEffect(() => {
    if (isLoggedIn) {
      runAutoEnsureAuth()
    } else {
      stopAutoEnsureAuth()
    }
  }, [isLoggedIn])

  const handleToggle = () => {
    if (isLoggedIn) {
      startLogoutAsync()
    } else {
      startLoginAsync()
    }
  }

  return (
    <FormControlLabel
      control={<Switch checked={isLoggedIn} onChange={handleToggle} disabled={disabled} />}
      label="Partner"
    />
  )
}
