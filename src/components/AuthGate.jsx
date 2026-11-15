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
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function normalizeEmailFromInput(inputUser) {
  const clean = String(inputUser || '').trim().toLowerCase();
  if (!clean) return 'adri@atelierdaadri.com';
  if (clean.includes('@')) return clean;
  return `${clean}@atelierdaadri.com`;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setIsCheckingAuth(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user || null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function login(inputUser, inputPass) {
    const email = normalizeEmailFromInput(inputUser);
    const password = String(inputPass || '');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return {
        success: false,
        error: 'Usuário ou senha incorretos. Verifique e tente novamente.',
      };
    }

    setUser(data.user);
    return { success: true };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function updateCredentials(currentPassword, newPassword) {
    if (!user?.email) {
      return { success: false, error: 'Sessão inválida.' };
    }

    const cleanPass = String(newPassword || '').trim();
    if (cleanPass.length < 6) {
      return {
        success: false,
        error: 'A nova senha deve ter pelo menos 6 caracteres.',
      };
    }

    // Confirma a senha atual antes de alterar
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: String(currentPassword || ''),
    });

    if (verifyErr) {
      return {
        success: false,
        error: 'A senha atual informada está incorreta.',
      };
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: cleanPass,
    });

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || 'Não foi possível alterar a senha.',
      };
    }

    return { success: true };
  }

  return {
    user,
    isAuthenticated: Boolean(user),
    isCheckingAuth,
    login,
    logout,
    updateCredentials,
  };
}

export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await onLogin(username, password);
      if (!result.success) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
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
            Acesso protegido na nuvem — Digite seu login e senha para entrar
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
                placeholder="Ex: adri"
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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Autenticando...' : 'Entrar no Atelier da Adri'}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--secondary)',
              marginTop: '0.2rem',
            }}
          >
            <ShieldCheck size={14} /> Dados protegidos e sincronizados no Supabase
          </div>
        </form>
      </div>
    </div>
  );
}

export function ChangePasswordModal({ onClose, onSaveCredentials }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    setLoading(true);
    try {
      const res = await onSaveCredentials(currentPassword, newPassword);
      if (!res.success) {
        setError(res.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div className="panel-title">
            <KeyRound size={20} color="var(--primary)" />
            Alterar Senha de Acesso
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
              Senha atualizada com sucesso no banco de dados!
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

          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Nova Senha *</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 6 caracteres"
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
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={17} /> {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
