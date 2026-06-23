import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LoadingProvider } from './lib/loadingContext';
import { LoadingBar } from './components/LoadingBar';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoadingProvider>
      <LoadingBar />
      <App />
    </LoadingProvider>
  </StrictMode>,
);
