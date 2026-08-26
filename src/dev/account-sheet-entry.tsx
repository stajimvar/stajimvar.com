import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountSheetDevFixture } from './AccountSheetDevFixture';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountSheetDevFixture />
  </StrictMode>
);
