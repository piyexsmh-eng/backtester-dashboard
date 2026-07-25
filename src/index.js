import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('error', (event) => {
  alert('ERROR: ' + event.message + '\nFile: ' + event.filename + '\nLine: ' + event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  alert('PROMISE ERROR: ' + (event.reason?.message || event.reason));
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
