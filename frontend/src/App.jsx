import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './AppRoutes.jsx';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <div className='App'>
        <AppRoutes />
        <ToastContainer />
      </div>
    </AuthProvider>
  );
}

export default App;