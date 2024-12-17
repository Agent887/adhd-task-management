import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize the root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
