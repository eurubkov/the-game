import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './Lobby.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById('root');
// Create a root using the newer React 18 API
const root = createRoot(container);
// Render the app using the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
