import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BasvurularimDevFixture } from './BasvurularimDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasvurularimDevFixture />
  </StrictMode>
);
