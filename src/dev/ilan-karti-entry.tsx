import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IlanKartiDevFixture } from './IlanKartiDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IlanKartiDevFixture />
  </StrictMode>
);
