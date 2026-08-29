import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SirketPanelDevFixture } from './SirketPanelDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SirketPanelDevFixture />
  </StrictMode>
);
