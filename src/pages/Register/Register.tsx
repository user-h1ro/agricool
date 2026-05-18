import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { LuEye, LuEyeOff, LuCircleCheck, LuArrowLeft } from 'react-icons/lu';
import agriCoolImage from '@/assets/agricool_logo.svg';

function getPasswordStrength(password: string): { label: string; color: string; score: number } {
  if (!password) return { label: '', color: '#ccc', score: 0 };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: 'Weak', color: '#e53e3e', score };
  if (score <= 3) return { label: 'Fair', color: '#ed8936', score };
  if (score <= 4) return { label: 'Strong', color: '#32ce0e', score };
  return { label: 'Very Strong', color: '#1a9900', score };
}

const BASE_INPUT: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '14px',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1.5px solid #e8e8e8',
  background: '#ffffff',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  color: '#1a1a1a',
  boxSizing: 'border-box',
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState('');

  const strength = getPasswordStrength(password);

  const iStyle = (field: string): React.CSSProperties => ({
    ...BASE_INPUT,
    borderColor: focused === field ? '#32ce0e' : '#e8e8e8',
    boxShadow: focused === field ? '0 0 0 3px rgba(50,206,14,0.12)' : 'none',
  });

  const handleSubmit = async () => {
    setError('');
    if (!firstName || !lastName || !gender || !country || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password });
      // register() signs out after signUp; do a fresh signUp to get user ID for profile
      const { data: signUpData } = await supabase.auth.signUp({ email, password });
      const userId = signUpData?.user?.id;
      if (userId) {
        await supabase.from('profiles').upsert({ id: userId, email, first_name: firstName, last_name: lastName, gender, country });
        await supabase.auth.signOut();
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f0fde8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <LuCircleCheck size={36} color="#32ce0e" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#1a1a1a' }}>Account Created! 🎉</h2>
          <p style={{ margin: '0 0 32px', fontSize: '14px', color: '#888', lineHeight: '1.6' }}>
            Welcome to AgriCool, <strong>{firstName}</strong>!<br />Please sign in to access your farm dashboard.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{ width: '100%', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #32ce0e 0%, #28a80c 100%)', border: 'none', color: '#ffffff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 20px rgba(50,206,14,0.35)' }}
          >
            Go to Sign In →
          </button>
        </div>
      </div>
    );
  }

  // ── Main Form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>

      {/* LEFT — brand panel */}
      <div
        className="reg-left"
        style={{
          width: '380px', flexShrink: 0,
          background: 'linear-gradient(145deg, #1a4d1a 0%, #2d7a2d 50%, #1e5c1e 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: '48px 32px', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(50,206,14,0.12)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '280px' }}>
          <img src={agriCoolImage} alt="AgriCool" style={{ width: '64px', height: '64px', marginBottom: '16px' }} />
          <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em' }}>AgriCool</h1>
          <p style={{ margin: '0 0 40px', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>Where Agriculture Meets Innovation</p>

          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>🌱 Join 10,000+ farmers</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Track crops, beat the weather, and grow your market — all from one clean dashboard.</p>
          </div>

          {['Free forever', 'No credit card needed', 'Works on any device'].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', justifyContent: 'center' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(50,206,14,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#32ce0e', flexShrink: 0 }}>✓</div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form */}
      <div style={{ flex: 1, background: '#fafaf8', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#32ce0e')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginBottom: '28px', padding: 0, transition: 'color 0.2s' }}
          >
            <LuArrowLeft size={14} /> Back to login
          </button>

          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Create your account</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>Fill in your details to get started.</p>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Name */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>First Name</label>
                <input placeholder="Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} onFocus={() => setFocused('fn')} onBlur={() => setFocused('')} style={iStyle('fn')} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Last Name</label>
                <input placeholder="Dela Cruz" value={lastName} onChange={(e) => setLastName(e.target.value)} onFocus={() => setFocused('ln')} onBlur={() => setFocused('')} style={iStyle('ln')} />
              </div>
            </div>

            {/* Gender & Country */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} onFocus={() => setFocused('gender')} onBlur={() => setFocused('')}
                  style={{ ...BASE_INPUT, borderColor: focused === 'gender' ? '#32ce0e' : '#e8e8e8', boxShadow: focused === 'gender' ? '0 0 0 3px rgba(50,206,14,0.12)' : 'none', appearance: 'auto', cursor: 'pointer' }}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} onFocus={() => setFocused('country')} onBlur={() => setFocused('')}
                  style={{ ...BASE_INPUT, borderColor: focused === 'country' ? '#32ce0e' : '#e8e8e8', boxShadow: focused === 'country' ? '0 0 0 3px rgba(50,206,14,0.12)' : 'none', appearance: 'auto', cursor: 'pointer' }}>
                  <option value="">Select</option>
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Email Address</label>
              <input placeholder="juan@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} style={iStyle('email')} />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input placeholder="Min. 6 characters" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('pw')} onBlur={() => setFocused('')} style={{ ...iStyle('pw'), paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '999px', background: i <= strength.score ? strength.color : '#e8e8e8', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strength.color, fontWeight: '600' }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Re-enter password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocused('cpw')}
                  onBlur={() => setFocused('')}
                  style={{
                    ...BASE_INPUT, paddingRight: '44px',
                    borderColor: confirmPassword ? (confirmPassword === password ? '#32ce0e' : '#e53e3e') : focused === 'cpw' ? '#32ce0e' : '#e8e8e8',
                    boxShadow: focused === 'cpw' ? '0 0 0 3px rgba(50,206,14,0.12)' : 'none',
                  }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showConfirmPassword ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <p style={{ margin: '3px 0 0 2px', fontSize: '11px', fontWeight: '600', color: confirmPassword === password ? '#32ce0e' : '#e53e3e' }}>
                  {confirmPassword === password ? '✓ Passwords match' : "✗ Passwords don't match"}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '12px', padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#c53030', fontWeight: '500' }}>⚠️ {error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', height: '52px', borderRadius: '14px',
                background: loading ? '#a0d88a' : 'linear-gradient(135deg, #32ce0e 0%, #28a80c 100%)',
                border: 'none', color: '#ffffff', fontWeight: '700', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 20px rgba(50,206,14,0.25)',
                marginTop: '4px',
              }}
            >
              {loading ? 'Creating account...' : 'Create Account 🌱'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', margin: '4px 0 0' }}>
              Already have an account?{' '}
              <span onClick={() => navigate('/')} style={{ color: '#32ce0e', fontWeight: '700', cursor: 'pointer' }}>
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .reg-left { display: none !important; } }
      `}</style>
    </div>
  );
};

export default Register;
