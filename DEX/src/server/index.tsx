// This directory is a placeholder for your future backend server code.
// You can initialize an Express, Koa, or any other Node.js server here.



import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);