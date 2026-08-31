import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FirsatKartiDevFixture } from './FirsatKartiDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirsatKartiDevFixture />
  </StrictMode>
);
