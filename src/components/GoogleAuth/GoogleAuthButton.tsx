import { useGoogleLogin } from "@react-oauth/google";
import { useGoogleAuthStore } from "../../stores/GoogleAuthStore";
import { Button } from "@mui/material";
import React from "react";

export function GoogleAuthButton() {
  const { setAuth, loadUserInfoAsync } = useGoogleAuthStore();
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAuth(tokenResponse);
      loadUserInfoAsync();
    },
    onError: (error) => {
      console.error('Ошибка авторизации:', error);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  });

  return (
    <Button
      variant="contained"
      onClick={() => login()}
      sx={{
        backgroundColor: '#4285F4',
        '&:hover': {
          backgroundColor: '#357ABD',
        },
      }}
    >
      Войти через Google
    </Button>
  );
}
