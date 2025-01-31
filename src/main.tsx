import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import { GeotabLifecycle } from './lib/GeotabLifecycle';

console.log("Hello World!")

// Check if 'geotab' is defined before adding the add-in
// if (typeof geotab !== 'undefined') {
//   console.log("Running in Geotab Platform")
//   geotab.addin.AirfinderAddIn = GeotabLifecycle();
// } else {
//   console.warn("Not running in Geotab Platform")
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
