import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { flushOutbox, getSettings } from './db/repository';
// Fonts are bundled, not fetched from Google: the app works offline and no
// third party learns who opened it.
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource-variable/outfit/index.css';
import './styles.css';

// Creates the settings row once, so screens can read it without writing.
void getSettings().then(() => flushOutbox(Date.now())).catch(() => undefined);

// Whenever the app comes back or the network does, send whatever is waiting.
const flush = () => void flushOutbox(Date.now()).catch(() => undefined);
window.addEventListener('online', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') flush();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
