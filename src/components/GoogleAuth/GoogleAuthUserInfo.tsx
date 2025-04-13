import { Avatar, Box, Button, Typography } from "@mui/material";
import { useGoogleAuthStore } from "../../stores/GoogleAuthStore";
import React from "react";

export function GoogleAuthUserInfo() {
  const { userInfo, clearAuth } = useGoogleAuthStore();

  const handleLogout = () => {
    clearAuth();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {userInfo && (
          <>
            <Avatar src={userInfo.picture} alt={userInfo.name} />
            <Box>
              <Typography variant="subtitle1">{userInfo.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {userInfo.email}
              </Typography>
            </Box>
          </>
        )}
        <Button
          variant="outlined"
          color="error"
          onClick={handleLogout}
        >
          Выйти
        </Button>
      </Box>
    </Box>
  );
}
