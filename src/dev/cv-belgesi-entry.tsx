import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CvBelgesiDevFixture } from './CvBelgesiDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CvBelgesiDevFixture />
  </StrictMode>
);
