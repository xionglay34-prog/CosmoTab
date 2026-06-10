import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import './popup.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  );
}
