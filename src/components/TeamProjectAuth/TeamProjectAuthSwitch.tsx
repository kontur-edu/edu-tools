import { useEffect } from "react"
import { useTeamProjectStore } from "../../stores/TeamProjectStore"
import { FormControlLabel, Switch } from "@mui/material"
import React from "react"

export function TeamProjectAuthSwitch() {
  const isLoggedIn = useTeamProjectStore((state) => state.currentAuth !== null)
  const isLoggingIn = useTeamProjectStore((state) => state.isLoggingIn)
  const isLoggingOut = useTeamProjectStore((state) => state.isLoggingOut)
  const runAutoEnsureAuth = useTeamProjectStore((state) => state.runAutoEnsureAuth)
  const stopAutoEnsureAuth = useTeamProjectStore((state) => state.stopAutoEnsureAuth)
  const startLoginAsync = useTeamProjectStore((state) => state.startLoginAsync)
  const startLogoutAsync = useTeamProjectStore((state) => state.startLogoutAsync)

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
      label="TeamProject"
    />
  )
}
