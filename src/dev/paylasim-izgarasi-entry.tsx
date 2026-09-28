import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaylasimIzgarasiDevFixture } from './PaylasimIzgarasiDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaylasimIzgarasiDevFixture />
  </StrictMode>
);
