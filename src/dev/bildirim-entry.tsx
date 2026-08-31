import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BildirimDevFixture } from './BildirimDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BildirimDevFixture />
  </StrictMode>
);
