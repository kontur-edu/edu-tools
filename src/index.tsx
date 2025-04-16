import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './components/App';
import theme from './components/theme';
import { useItsStore } from './stores/ItsStore';
import { useGoogleStore } from './stores/GoogleStore';
import { useBrsStore } from './stores/BrsStore';
import { useTeamProjectStore } from './stores/TeamProjectStore';
import { usePartnerStore } from './stores/PartnerStore';
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);
useItsStore.getState().tryLoginFromCacheAsync();
useBrsStore.getState().tryLoginFromCacheAsync();
useTeamProjectStore.getState().tryLoginFromCacheAsync();
usePartnerStore.getState().tryLoginFromCacheAsync();
useGoogleStore.getState().tryLoginFromCacheAsync();

root.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
