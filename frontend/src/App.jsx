import React from 'react';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import CallModal from './components/CallModal';

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--wa-bg-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--wa-accent)',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Loading WhatsApp...
      </div>
    );
  }

  return (
    <CallProvider>
      {user ? <Home /> : <AuthPage />}
      <CallModal />
    </CallProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
