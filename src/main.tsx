import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Tailwind first, then brand tokens, then the brand reset (so it wins over preflight).
import './styles/global.css';
import './styles/tokens/colors.css';
import './styles/tokens/typography.css';
import './styles/tokens/spacing.css';
import './styles/tokens/elevation.css';
import './styles/base.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
