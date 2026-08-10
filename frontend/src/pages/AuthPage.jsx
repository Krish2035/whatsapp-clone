import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!username.trim()) throw new Error('Username is required');
        await register(username, email, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--wa-bg-deep)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="wa-modal-content"
        style={{
          width: '92%',
          maxWidth: '420px',
          backgroundColor: 'var(--wa-bg-panel)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--wa-border)'
        }}
      >
        {/* WhatsApp Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--wa-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 16px rgba(0, 168, 132, 0.3)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm.01 16.68c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-3.13.82.83-3.05-.2-.32a8.16 8.16 0 0 1-1.26-4.38c0-4.51 3.67-8.18 8.18-8.18 2.19 0 4.24.85 5.79 2.4 1.55 1.55 2.4 3.6 2.4 5.78 0 4.52-3.67 8.19-8.19 8.19z"/>
            </svg>
          </div>
          <h2 style={{ color: 'var(--wa-text-primary)', fontSize: '24px', fontWeight: '600' }}>WhatsApp Web</h2>
          <p style={{ color: 'var(--wa-text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            {isLogin ? 'Sign in to access your chats' : 'Create an account to start chatting'}
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--wa-bg-input)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isLogin ? 'var(--wa-bg-panel)' : 'transparent',
              color: isLogin ? 'var(--wa-accent)' : 'var(--wa-text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: !isLogin ? 'var(--wa-bg-panel)' : 'transparent',
              color: !isLogin ? 'var(--wa-accent)' : 'var(--wa-text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--wa-border)',
                  backgroundColor: 'var(--wa-bg-input)',
                  color: 'var(--wa-text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'var(--wa-bg-input)',
                color: 'var(--wa-text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'var(--wa-bg-input)',
                color: 'var(--wa-text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--wa-accent)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
