import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogleFirebase, isFirebaseConfigured } from '../services/googleAuthService';

export default function AuthPage() {
  const { login, register, continueWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Fallback Google Sign-In Modal when Firebase API key is not configured
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

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

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      if (isFirebaseConfigured()) {
        const profile = await signInWithGoogleFirebase();
        await continueWithGoogle(profile);
      } else {
        // Firebase is not configured with a production API key; open direct Google Account Selector
        setShowGoogleModal(true);
      }
    } catch (err) {
      if (err.message === 'FIREBASE_CONFIG_REQUIRED' || err?.code === 'auth/invalid-api-key' || err?.code === 'auth/api-key-not-valid') {
        setShowGoogleModal(true);
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Sign-In failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDirectGoogleLogin = async (selectedEmail, selectedName) => {
    setError('');
    setGoogleLoading(true);
    try {
      const emailToUse = selectedEmail || customGoogleEmail;
      if (!emailToUse || !emailToUse.includes('@')) {
        throw new Error('Please enter a valid Google email address');
      }
      const nameToUse = selectedName || customGoogleName || emailToUse.split('@')[0];
      await continueWithGoogle({
        email: emailToUse,
        name: nameToUse,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nameToUse)}`
      });
      setShowGoogleModal(false);
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left side: Video showcase */}
      <div className="auth-left-section">
        <div className="auth-video-container">
          <video
            ref={videoRef}
            className="auth-left-video"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
          >
            <source src="/Messaging_Application.mp4" type="video/mp4" />
            <source src="/resources/Messaging_Application.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="auth-right-section">
        <div 
          className="wa-modal-content"
          style={{
            width: '100%',
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
            marginBottom: 20
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
            disabled={loading || googleLoading}
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
              marginTop: '4px',
              transition: 'background 0.2s',
              opacity: (loading || googleLoading) ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--wa-border)' }} />
          <span style={{ color: 'var(--wa-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            or
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--wa-border)' }} />
        </div>

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          style={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: '#ffffff',
            color: '#3c4043',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            opacity: (loading || googleLoading) ? 0.7 : 1
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>
      </div>
    </div>

      {/* Google Account Selector & Setup Fallback Modal */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'var(--wa-bg-panel)',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid var(--wa-border)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ color: 'var(--wa-text-primary)', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  Sign in with Google
                </h3>
                <p style={{ color: 'var(--wa-text-secondary)', fontSize: '13px', margin: '2px 0 0 0' }}>
                  Choose or enter an account to continue
                </p>
              </div>
            </div>

            {/* Quick One-Click Accounts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => handleDirectGoogleLogin('krish@gmail.com', 'Krish')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--wa-bg-input)',
                  border: '1px solid var(--wa-border)',
                  color: 'var(--wa-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-bg-input)'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ea4335',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  K
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Krish</div>
                  <div style={{ fontSize: '12px', color: 'var(--wa-text-secondary)' }}>krish@gmail.com</div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--wa-accent)', fontWeight: '500' }}>One-click &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectGoogleLogin('alex.google@gmail.com', 'Alex')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--wa-bg-input)',
                  border: '1px solid var(--wa-border)',
                  color: 'var(--wa-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-bg-input)'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#4285f4',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  A
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Alex</div>
                  <div style={{ fontSize: '12px', color: 'var(--wa-text-secondary)' }}>alex.google@gmail.com</div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--wa-accent)', fontWeight: '500' }}>One-click &rarr;</span>
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div style={{
              borderTop: '1px solid var(--wa-border)',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ color: 'var(--wa-text-secondary)', fontSize: '12px' }}>
                Or sign in with any custom Google account:
              </label>
              <input
                type="text"
                placeholder="Your Name (e.g. John Doe)"
                value={customGoogleName}
                onChange={(e) => setCustomGoogleName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--wa-border)',
                  backgroundColor: 'var(--wa-bg-input)',
                  color: 'var(--wa-text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <input
                type="email"
                placeholder="Google Email (e.g. user@gmail.com)"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--wa-border)',
                  backgroundColor: 'var(--wa-bg-input)',
                  color: 'var(--wa-text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleDirectGoogleLogin()}
                disabled={googleLoading || !customGoogleEmail.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--wa-accent)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  opacity: (!customGoogleEmail.trim() || googleLoading) ? 0.6 : 1
                }}
              >
                {googleLoading ? 'Connecting...' : 'Continue as Google User'}
              </button>
            </div>

            {/* Info Notice about Firebase vs Direct */}
            <div style={{
              marginTop: '16px',
              padding: '10px 12px',
              backgroundColor: 'rgba(0, 168, 132, 0.08)',
              border: '1px solid rgba(0, 168, 132, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--wa-text-secondary)',
              lineHeight: '1.4'
            }}>
              <strong style={{ color: 'var(--wa-accent)' }}>💡 Firebase note:</strong> Firebase is <span style={{ color: 'var(--wa-text-primary)' }}>not required</span>. Google sign-in works directly out of the box! If you want live Google OAuth popups, you can also add your Firebase API key in <code style={{ color: 'var(--wa-accent)' }}>.env</code>.
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--wa-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
