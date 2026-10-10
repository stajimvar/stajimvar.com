import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfilDuzenlemeDevFixture } from './ProfilDuzenlemeDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfilDuzenlemeDevFixture />
  </StrictMode>
);
