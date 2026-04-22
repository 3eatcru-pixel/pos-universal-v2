import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './ModularApp.tsx';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
