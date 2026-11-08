import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Mail, 
  Key, 
  RefreshCw,
  Code2
} from 'lucide-react';
import { SupabaseConfig, AuthUser } from '../types';
import { 
  testSupabaseConnection, 
  signInWithGoogleOAuth, 
  signInWithSupabaseEmail, 
  signUpWithSupabaseEmail, 
  signOutUser,
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (config: SupabaseConfig) => void;
  authUser: AuthUser | null;
  onUserChange: (user: AuthUser | null) => void;
  onTriggerSyncAll: () => Promise<void>;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  authUser,
  onUserChange,
  onTriggerSyncAll,
}) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'config' | 'schema'>('auth');
  
  // Config form state
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Schema copy state
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setConnectionStatus({ success: false, message: 'Please provide both URL and Anon Key' });
      return;
    }
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setConnectionStatus(res);
      if (res.success) {
        onSaveConfig({
          url: url.trim(),
          anonKey: anonKey.trim(),
          isConnected: true,
          autoSync,
        });
      }
    } catch (e: any) {
      setConnectionStatus({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = () => {
    onSaveConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: Boolean(url && anonKey),
      autoSync,
    });
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const { user, error } = await signInWithGoogleOAuth();
      if (error) {
        setAuthMessage({ type: 'error', text: error });
      } else if (user) {
        onUserChange(user);
        setAuthMessage({ type: 'success', text: 'Signed in with Google successfully!' });
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message || 'Google Auth failed' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    setAuthMessage(null);
    try {
      if (authMode === 'signin') {
        const { user, error } = await signInWithSupabaseEmail(email, password);
        if (error) {
          setAuthMessage({ type: 'error', text: error });
        } else if (user) {
          onUserChange(user);
          setAuthMessage({ type: 'success', text: `Authenticated as ${user.email}!` });
        }
      } else {
        const { user, error } = await signUpWithSupabaseEmail(email, password);
        if (error) {
          setAuthMessage({ type: 'error', text: error });
        } else if (user) {
          onUserChange(user);
          setAuthMessage({ type: 'success', text: 'Account registered and authenticated!' });
        }
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message || 'Authentication error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onUserChange(null);
    setAuthMessage({ type: 'success', text: 'Signed out successfully.' });
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleManualSyncNow = async () => {
    setIsSyncingAll(true);
    try {
      await onTriggerSyncAll();
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-mono text-neutral-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-2xl overflow-hidden glow-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                SUPABASE_SYNC // AUTH_NODE
              </h3>
              <p className="text-xs text-neutral-400">
                Google OAuth, Supabase Auth, and real-time database sync.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-orange-500/20 px-6 pt-2 bg-[#0a0a0e] text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('auth')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'auth'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-white'
            }`}
          >
            USER_AUTH
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'config'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-white'
            }`}
          >
            SUPABASE_CONFIG
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'schema'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-white'
            }`}
          >
            SQL_SCHEMA
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {authMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                authMessage.type === 'error'
                  ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/40 glow-border'
              }`}
            >
              {authMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{authMessage.text}</span>
            </div>
          )}

          {/* TAB 1: User Authentication */}
          {activeTab === 'auth' && (
            <div className="space-y-4 font-mono">
              {authUser ? (
                <div className="p-4 rounded-xl bg-[#0f0f14] border border-orange-500/30 space-y-3 glow-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400 uppercase">ACTIVE_SESSION_NODE</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/40">
                      {authUser.provider}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-sans">
                    {authUser.avatarUrl ? (
                      <img src={authUser.avatarUrl} alt="User" className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-500/40" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-black font-bold flex items-center justify-center text-lg shadow-sm">
                        {authUser.name?.charAt(0) || authUser.email.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{authUser.name || 'User'}</p>
                      <p className="text-xs text-neutral-400 font-mono">{authUser.email}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between font-mono">
                    <button
                      onClick={handleManualSyncNow}
                      disabled={isSyncingAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAll ? 'SYNCING...' : 'SYNC_VAULT_TO_SUPABASE'}</span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-neutral-700 bg-[#121216] text-white font-bold text-xs hover:border-orange-500/50 hover:bg-neutral-900 transition shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>SIGN IN WITH GOOGLE</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-neutral-800 w-full" />
                    <span className="bg-[#09090c] px-2 text-[10px] text-neutral-500 uppercase tracking-wider absolute">
                      Or with Supabase Auth
                    </span>
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailAuth} className="space-y-3 font-mono">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="developer@node.io"
                          className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        className="text-orange-400 hover:underline"
                      >
                        {authMode === 'signin' ? "Need an account? Sign up" : 'Have an account? Sign in'}
                      </button>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange disabled:opacity-50 transition shadow-sm"
                      >
                        {authLoading ? 'AUTHENTICATING...' : authMode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Supabase Connection Configuration */}
          {activeTab === 'config' && (
            <div className="space-y-4 font-mono">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0d12] border border-neutral-800 text-xs">
                <div>
                  <p className="font-bold text-white">Real-Time Auto Sync</p>
                  <p className="text-[11px] text-neutral-400">Stream changes across multiple devices</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={e => setAutoSync(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
              </div>

              {connectionStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    connectionStatus.success
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 glow-border'
                      : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
                  }`}
                >
                  {connectionStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{connectionStatus.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-orange-400 border border-orange-500/30 transition"
                >
                  {testingConnection ? 'TESTING...' : 'TEST_CONNECTION'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange transition shadow-sm"
                >
                  SAVE_CONFIG
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SQL Database Schema */}
          {activeTab === 'schema' && (
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-orange-500" />
                    <span>SUPABASE_SQL_MIGRATION</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Paste into Supabase SQL Editor to provision tables & RLS.
                  </p>
                </div>
                <button
                  onClick={handleCopySchema}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange transition"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'COPIED!' : 'COPY_SQL'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-black text-orange-400 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed border border-neutral-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
