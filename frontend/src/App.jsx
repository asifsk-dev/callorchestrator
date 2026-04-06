import React, { useEffect } from 'react';
import CallPage from './pages/CallPage.jsx';

function App() {
  // Ensure dark mode class is set on the HTML element for Tailwind's darkMode: 'class'
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return <CallPage />;
}

export default App;
