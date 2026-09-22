import React from 'react';
import ReactDOM from 'react-dom/client';

// Orden obligatorio (08_UI_SYSTEM.md §5.1): Tokens → UI System → Bootstrap.
// Bootstrap se carga primero para que `base.css` pueda imponerle los tokens
// del proyecto mediante sus variables CSS (UDS-05).
import 'bootstrap/dist/css/bootstrap.min.css';
// `fonts.css` va antes que los tokens: declara las familias que
// `--font-family-display` nombra (UDSP-01). Alojadas localmente, no por enlace
// a Google, para no tener que abrir la CSP de producción (03_SEGURIDAD.md §12).
import './shared/styles/fonts.css';
import './shared/styles/tokens.css';
import './shared/styles/base.css';

import App from './app/App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
