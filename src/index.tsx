import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './components/App';
import theme from './components/theme';
import { ItsController } from './controllers/ItsController';
import { ItsUrlProvider } from './apis/ItsUrlProvider';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);
const itsController = new ItsController(new ItsUrlProvider(true));
itsController.tryLogInFromCacheAsync();

root.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App itsController={itsController} />
  </ThemeProvider>,
);
