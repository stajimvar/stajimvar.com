import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ZamanTupuDevFixture } from './ZamanTupuDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ZamanTupuDevFixture />
  </StrictMode>
);
