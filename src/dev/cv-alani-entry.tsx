import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CvAlaniDevFixture } from './CvAlaniDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CvAlaniDevFixture />
  </StrictMode>
);
