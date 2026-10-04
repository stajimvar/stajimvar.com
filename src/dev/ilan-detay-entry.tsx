import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IlanDetayDevFixture } from './IlanDetayDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IlanDetayDevFixture />
  </StrictMode>
);
