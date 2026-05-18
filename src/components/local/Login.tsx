import {
  Drawer,
  Portal,
  Stack,
  Input,
  Button,
  Text,
  Box,
  HStack,
  Link,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { LuEye, LuEyeOff, LuMail, LuLeaf } from 'react-icons/lu';

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'forgot';

export default function Login({ isOpen, onClose }: LoginProps) {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const reset = () => {
    setError('');
    setResetSent(false);
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleClose = () => {
    reset();
    setMode('login');
    onClose();
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      reset();
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      mode === 'login' ? handleLogin() : handleForgotPassword();
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleClose} placement="bottom">
      <Portal>
        <Drawer.Backdrop style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.35)' }} />
        <Drawer.Positioner>
          <Drawer.Content
            style={{
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              paddingBottom: '32px',
              boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
              background: '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: '#e8e8e8' }} />
            </div>

            <Drawer.CloseTrigger
              style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer', color: '#bbb', background: 'none', border: 'none', fontSize: '20px' }}
            />

            <div style={{ padding: '24px 28px 0' }}>
              <Stack gap={6}>
                {/* Logo + Title */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f0fde8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LuLeaf size={15} color="#32ce0e" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#32ce0e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      AgriCool
                    </span>
                  </div>

                  <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                    {mode === 'login' ? 'Welcome back! 👋' : 'Reset your password'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>
                    {mode === 'login' ? 'Sign in to manage your farm.' : "We'll send a reset link to your email."}
                  </p>
                </div>

                {/* Fields */}
                <Stack gap={3}>
                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>
                      Email Address
                    </label>
                    <input
                      placeholder="your@email.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '14px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #e8e8e8',
                        background: '#ffffff',
                        width: '100%',
                        outline: 'none',
                        color: '#1a1a1a',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#32ce0e';
                        e.target.style.boxShadow = '0 0 0 3px rgba(50,206,14,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e8e8e8';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Password — login mode only */}
                  {mode === 'login' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          placeholder="Enter your password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '14px',
                            padding: '10px 44px 10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #e8e8e8',
                            background: '#ffffff',
                            width: '100%',
                            outline: 'none',
                            color: '#1a1a1a',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#32ce0e';
                            e.target.style.boxShadow = '0 0 0 3px rgba(50,206,14,0.12)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e8e8e8';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          {showPassword ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </Stack>

                {/* Error */}
                {error && (
                  <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '12px', padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#c53030', fontWeight: '500' }}>⚠️ {error}</p>
                  </div>
                )}

                {/* Reset sent */}
                {resetSent && (
                  <div style={{ background: '#f0fde8', border: '1px solid #c6f6d5', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LuMail size={15} color="#38a169" />
                    <p style={{ margin: 0, fontSize: '13px', color: '#276749', fontWeight: '500' }}>
                      Reset link sent! Check your inbox and spam folder.
                    </p>
                  </div>
                )}

                {/* Primary Action */}
                <button
                  onClick={mode === 'login' ? handleLogin : handleForgotPassword}
                  disabled={loading || (mode === 'forgot' && resetSent)}
                  style={{
                    width: '100%', height: '50px', borderRadius: '14px',
                    background: (loading || resetSent) ? '#a0d88a' : 'linear-gradient(135deg, #32ce0e 0%, #28a80c 100%)',
                    border: 'none', color: '#ffffff', fontWeight: '700', fontSize: '15px',
                    cursor: (loading || resetSent) ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '0 4px 20px rgba(50,206,14,0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Send Reset Link'}
                </button>

                {/* Footer links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mode === 'login' && (
                    <p
                      onClick={() => { setMode('forgot'); setError(''); }}
                      style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', cursor: 'pointer', margin: 0 }}
                    >
                      Forgot password?
                    </p>
                  )}
                  {mode === 'forgot' && (
                    <p
                      onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
                      style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', cursor: 'pointer', margin: 0 }}
                    >
                      ← Back to Sign In
                    </p>
                  )}

                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>
                      Don't have an account?{' '}
                      <span
                        onClick={() => { handleClose(); navigate('/register'); }}
                        style={{ color: '#32ce0e', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Create one for free →
                      </span>
                    </p>
                  </div>
                </div>
              </Stack>
            </div>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
