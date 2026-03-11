import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name:           '',
    shopName:       '',
    emailOrPhone:   '',
    password:       '',
    confirmPassword:'',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy,        setBusy]        = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Live password strength
  const pwStrength = (() => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8)              score++;
    if (/[A-Z]/.test(p))            score++;
    if (/[0-9]/.test(p))            score++;
    if (/[^A-Za-z0-9]/.test(p))     score++;
    if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',    w: 'w-1/4' };
    if (score === 2) return { label: 'Fair',   color: 'bg-yellow-400', w: 'w-2/4' };
    if (score === 3) return { label: 'Good',   color: 'bg-blue-400',   w: 'w-3/4' };
    return               { label: 'Strong', color: 'bg-green-500',  w: 'w-full' };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 8)
      return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirmPassword)
      return toast.error('Passwords do not match');

    setBusy(true);
    try {
      const { data } = await api.post('/auth/signup', {
        name:         form.name.trim(),
        shopName:     form.shopName.trim(),
        emailOrPhone: form.emailOrPhone.trim(),
        password:     form.password,
        confirmPassword: form.confirmPassword,
      });

      // Store token + user the same way login does
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));

      toast.success(`Welcome, ${data.user.name}! Your shop is ready. 🎉`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sign up failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">PhotoPass Pro</h1>
          <p className="text-blue-200 text-sm mt-0.5">Create your shopkeeper account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Sign Up</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="Ahmed Ali Khan"
                value={form.name}
                onChange={set('name')}
              />
            </div>

            {/* Shop Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="Star Photo Studio"
                value={form.shopName}
                onChange={set('shopName')}
              />
            </div>

            {/* Email or Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="you@email.com  or  03001234567"
                value={form.emailOrPhone}
                onChange={set('emailOrPhone')}
                inputMode="email"
                autoComplete="username"
              />
              <p className="text-xs text-gray-400 mt-1">
                You'll use this to log in.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-gray-400">(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>

              {/* Strength bar */}
              {pwStrength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color} ${pwStrength.w}`} />
                  </div>
                  <p className={`text-xs font-medium ${
                    pwStrength.label === 'Weak'   ? 'text-red-500'   :
                    pwStrength.label === 'Fair'   ? 'text-yellow-600':
                    pwStrength.label === 'Good'   ? 'text-blue-500'  : 'text-green-600'
                  }`}>{pwStrength.label} password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  className={`input pr-10 ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-400 focus:ring-red-400'
                      : form.confirmPassword && form.password === form.confirmPassword
                      ? 'border-green-400 focus:ring-green-400'
                      : ''
                  }`}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-2.5 text-base mt-2"
            >
              {busy ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          {/* Already have account */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
