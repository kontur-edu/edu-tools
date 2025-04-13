import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './components/App';
import theme from './components/theme';
import { useItsStore } from './stores/ItsStore';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);
useItsStore.getState().tryLogInFromCacheAsync();

root.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
