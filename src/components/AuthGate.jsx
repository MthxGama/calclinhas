'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  Check,
  X,
} from 'lucide-react';

const AUTH_STORAGE_KEY = 'atelier_adri_auth_session_v1';
const CREDENTIALS_STORAGE_KEY = 'atelier_adri_credentials_v1';

const DEFAULT_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_APP_USER || 'adri',
  password: process.env.NEXT_PUBLIC_APP_PASSWORD || 'adri123',
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS);

  useEffect(() => {
    try {
      const savedCreds = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (savedCreds) {
        const parsed = JSON.parse(savedCreds);
        if (parsed?.username && parsed?.password) {
          setCredentials(parsed);
        }
      }

      const localSession = localStorage.getItem(AUTH_STORAGE_KEY);
      const tempSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (localSession === 'authenticated' || tempSession === 'authenticated') {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  function login(inputUser, inputPass, rememberMe = true) {
    const cleanInputUser = String(inputUser || '').trim().toLowerCase();
    const cleanExpectedUser = String(credentials.username || '').trim().toLowerCase();
    const cleanInputPass = String(inputPass || '');

    if (cleanInputUser === cleanExpectedUser && cleanInputPass === credentials.password) {
      setIsAuthenticated(true);
      try {
        if (rememberMe) {
          localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
        } else {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (e) {
        console.error(e);
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Usuário ou senha incorretos. Verifique e tente novamente.',
    };
  }

  function logout() {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  function updateCredentials(currentPassword, newUsername, newPassword) {
    if (String(currentPassword || '') !== credentials.password) {
      return {
        success: false,
        error: 'A senha atual informada está incorreta.',
      };
    }
    const cleanUser = String(newUsername || '').trim();
    const cleanPass = String(newPassword || '').trim();
    if (!cleanUser || cleanPass.length < 4) {
      return {
        success: false,
        error: 'Informe um usuário válido e uma nova senha com pelo menos 4 caracteres.',
      };
    }

    const updated = { username: cleanUser, password: cleanPass };
    setCredentials(updated);
    try {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    return { success: true };
  }

  return {
    isAuthenticated,
    isCheckingAuth,
    credentials,
    login,
    logout,
    updateCredentials,
  };
}

export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const result = onLogin(username, password, rememberMe);
    if (!result.success) {
      setError(result.error);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} />
          </div>
          <h1 className="auth-title">Atelier da Adri</h1>
          <p className="auth-subtitle">
            Acesso restrito — Digite seu login e senha para entrar no sistema
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <Lock size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">
              <span>Login / Usuário</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={17}
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                }}
              />
              <input
                type="text"
                autoComplete="username"
                className="input"
                style={{ paddingLeft: '2.35rem' }}
                placeholder="Digite seu usuário..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>Senha</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input"
                style={{ paddingLeft: '2.35rem', paddingRight: '2.6rem' }}
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            Manter conectada neste aparelho
          </label>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <LogIn size={18} /> Entrar no Atelier da Adri
          </button>
        </form>
      </div>
    </div>
  );
}

export function ChangePasswordModal({
  currentUsername,
  onClose,
  onSaveCredentials,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(currentUsername || 'adri');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    const res = onSaveCredentials(currentPassword, newUsername, newPassword);
    if (!res.success) {
      setError(res.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div className="panel-title">
            <KeyRound size={20} color="var(--primary)" />
            Alterar Login e Senha
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div
              style={{
                background: 'var(--bg-sage-soft)',
                color: 'var(--secondary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Login e senha atualizados com sucesso!
            </div>
          )}

          <div className="field-group">
            <label className="field-label">
              <span>Senha Atual *</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="Digite sua senha atual..."
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>Novo Login / Usuário *</span>
            </label>
            <input
              type="text"
              className="input"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Nova Senha *</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 4 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Confirmar Nova Senha *</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={17} /> Salvar Nova Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
