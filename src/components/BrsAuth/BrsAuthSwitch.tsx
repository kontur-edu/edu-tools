import { useEffect } from "react"
import { useBrsStore } from "../../stores/BrsStore"
import { FormControlLabel, Switch } from "@mui/material"
import React from "react"

export function BrsAuthSwitch() {
  const isLoggedIn = useBrsStore((state) => state.currentAuth !== null)
  const isLoggingIn = useBrsStore((state) => state.isLoggingIn)
  const isLoggingOut = useBrsStore((state) => state.isLoggingOut)
  const runAutoEnsureAuth = useBrsStore((state) => state.runAutoEnsureAuth)
  const stopAutoEnsureAuth = useBrsStore((state) => state.stopAutoEnsureAuth)
  const startLoginAsync = useBrsStore((state) => state.startLoginAsync)
  const startLogoutAsync = useBrsStore((state) => state.startLogoutAsync)

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
      label="БРС"
    />
  )
}
