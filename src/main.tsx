import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import './index.css';
import BowSandbox from './BowSandbox.tsx';
import { connectionBuilder } from './spacetime';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <BowSandbox />
    </SpacetimeDBProvider>
  </StrictMode>
);
