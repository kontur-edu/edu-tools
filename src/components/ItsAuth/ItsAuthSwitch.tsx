import { useEffect } from "react"
import { useItsStore } from "../../stores/ItsStore"
import { FormControlLabel, Switch } from "@mui/material"
import React from "react"

export function ItsAuthSwitch() {
  const isLoggedIn = useItsStore((state) => state.currentAuth !== null)
  const isLoggingIn = useItsStore((state) => state.isLoggingIn)
  const isLoggingOut = useItsStore((state) => state.isLoggingOut)
  const runAutoEnsureAuth = useItsStore((state) => state.runAutoEnsureAuth)
  const stopAutoEnsureAuth = useItsStore((state) => state.stopAutoEnsureAuth)
  const startLoginAsync = useItsStore((state) => state.startLoginAsync)
  const startLogoutAsync = useItsStore((state) => state.startLogoutAsync)

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
      label="ИТС"
    />
  )
}
