import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import './AuthGate.css';

/**
 * Rendered by App.tsx instead of the main app whenever the user isn't fully
 * signed in: sign-in / create-account forms, and the TOTP challenge step
 * for accounts with two-factor login enabled (see ../auth/AuthContext.tsx
 * for how `status` is derived).
 */
const AuthGate: React.FC = () => {
  const { t } = useTranslation();
  const { status, signIn, signUp, verifyMfaChallenge, signOut } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <h1 className="auth-gate-brand">{t('auth.notConfigured.title')}</h1>
          <p>{t('auth.notConfigured.message')}</p>
        </div>
      </div>
    );
  }

  if (status === 'mfa-required') {
    const handleVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      const result = await verifyMfaChallenge(mfaCode.trim());
      setSubmitting(false);
      if (result) {
        setError(result);
      }
    };

    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <h1 className="auth-gate-brand">{t('auth.mfaChallenge.title')}</h1>
          <p>{t('auth.mfaChallenge.description')}</p>
          {error && <div className="auth-gate-error">{error}</div>}
          <form className="customer-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label>
                {t('auth.mfaChallenge.codeLabel')}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  autoFocus
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={() => signOut()}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="submit-button" disabled={submitting}>
                {t('auth.mfaChallenge.verifyButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signUp' && password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        const err = await signIn(email.trim(), password);
        if (err) setError(err);
      } else {
        const { error: err, needsEmailConfirmation } = await signUp(email.trim(), password);
        if (err) {
          setError(err);
        } else if (needsEmailConfirmation) {
          setSignupConfirmationSent(true);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (signupConfirmationSent) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <h1 className="auth-gate-brand">{t('auth.confirmEmail.title')}</h1>
          <p>{t('auth.confirmEmail.message', { email })}</p>
          <div className="auth-gate-switch">
            <button
              type="button"
              onClick={() => {
                setSignupConfirmationSent(false);
                setMode('signIn');
              }}
            >
              {t('auth.confirmEmail.backToSignIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-card">
        <h1 className="auth-gate-brand">{t('app.brandName')}</h1>
        <h2>{mode === 'signIn' ? t('auth.signIn.title') : t('auth.signUp.title')}</h2>
        {error && <div className="auth-gate-error">{error}</div>}
        <form className="customer-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              {t('auth.fields.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              {t('auth.fields.password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                minLength={mode === 'signUp' ? 8 : undefined}
                required
              />
            </label>
          </div>
          {mode === 'signUp' && (
            <div className="form-group">
              <label>
                {t('auth.fields.confirmPassword')}
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={submitting}>
              {mode === 'signIn' ? t('auth.signIn.submit') : t('auth.signUp.submit')}
            </button>
          </div>
        </form>
        <div className="auth-gate-switch">
          {mode === 'signIn' ? (
            <button type="button" onClick={() => setMode('signUp')}>
              {t('auth.signIn.switchToSignUp')}
            </button>
          ) : (
            <button type="button" onClick={() => setMode('signIn')}>
              {t('auth.signUp.switchToSignIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
