import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  Moon, 
  Sun, 
  Plus, 
  Radio, 
  Lock, 
  User, 
  LogOut, 
  ChevronDown, 
  LayoutDashboard, 
  MessageSquare, 
  KeyRound,
  Download,
  Terminal,
  Cpu
} from 'lucide-react';
import { AuthUser, SupabaseConfig } from '../types';

interface NavbarProps {
  activeView: 'vault' | 'dashboard';
  setActiveView: (view: 'vault' | 'dashboard') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  authUser: AuthUser | null;
  supabaseConfig: SupabaseConfig;
  onOpenExtractor: () => void;
  onOpenSupabaseModal: () => void;
  onOpenPassphraseModal: () => void;
  onOpenExportModal: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  isDarkMode,
  toggleDarkMode,
  authUser,
  supabaseConfig,
  onOpenExtractor,
  onOpenSupabaseModal,
  onOpenPassphraseModal,
  onOpenExportModal,
  onSignOut,
  isSyncing,
  onToggleMobileSidebar,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-orange-500/20 bg-black/95 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-neutral-400 hover:text-orange-400 rounded-lg hover:bg-neutral-900 border border-neutral-800 transition"
              title="Toggle Menu"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          )}

          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveView('vault')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 text-black shadow-lg shadow-orange-500/30 ring-1 ring-orange-400/50 group-hover:scale-105 transition duration-300">
              <span className="material-symbols-outlined font-bold text-2xl text-black">security</span>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-400 rounded-full border-2 border-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-display">
                  OMNI<span className="text-orange-500 glow-text-orange">CHAT</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <Terminal className="w-2.5 h-2.5" />
                  VAULT_v2
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono hidden sm:flex items-center gap-1.5">
                <span className="text-orange-500">[AES-256]</span>
                <span>•</span>
                <span>SUPABASE_SYNC</span>
              </p>
            </div>
          </div>

          {/* View Switcher Pills */}
          <div className="hidden md:flex items-center ml-4 p-1 rounded-xl bg-[#0d0d10] border border-orange-500/20">
            <button
              onClick={() => setActiveView('vault')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                activeView === 'vault'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-black shadow-md shadow-orange-500/30 glow-orange'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">chat</span>
              CHAT_VAULT
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                activeView === 'dashboard'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-black shadow-md shadow-orange-500/30 glow-orange'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">monitoring</span>
              TELEMETRY & LOGS
            </button>
          </div>
        </div>

        {/* Center / Right Status badges and controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time sync badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-[#0d0d10] border border-orange-500/30 text-orange-400 shadow-[0_0_10px_rgba(255,107,0,0.15)]">
            <Radio className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-orange-500 animate-pulse'}`} />
            <span>{isSyncing ? 'SYNCING_NODES...' : 'REALTIME_STREAM_LIVE'}</span>
          </div>

          {/* Encrypted at rest trigger */}
          <button
            onClick={onOpenPassphraseModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#0d0d10] text-neutral-300 hover:text-orange-400 hover:border-orange-500/50 border border-neutral-800 transition"
            title="Encryption at Rest settings"
          >
            <Lock className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden md:inline">ENCRYPTED_AT_REST</span>
          </button>

          {/* Supabase status trigger */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition border ${
              supabaseConfig.isConnected
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/50 hover:bg-orange-500/25 glow-border'
                : 'bg-[#0d0d10] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
            }`}
            title="Supabase & Auth Sync Settings"
          >
            <Database className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">
              {supabaseConfig.isConnected ? 'SUPABASE_SYNCED' : 'CONNECT_SUPABASE'}
            </span>
          </button>

          {/* Quick Export Button */}
          <button
            onClick={onOpenExportModal}
            className="p-2 text-neutral-400 hover:text-orange-400 rounded-xl hover:bg-neutral-900 border border-neutral-800 hover:border-orange-500/30 transition"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-neutral-400 hover:text-orange-400 rounded-xl hover:bg-neutral-900 border border-neutral-800 hover:border-orange-500/30 transition"
            title={isDarkMode ? 'Toggle High-Contrast Glow' : 'Switch Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-neutral-400" />}
          </button>

          {/* New Extraction Button */}
          <button
            onClick={onOpenExtractor}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black shadow-lg shadow-orange-500/30 glow-orange transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span className="hidden sm:inline">EXTRACT CHAT</span>
          </button>

          {/* User Profile / Auth Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-orange-500/50 transition"
            >
              {authUser?.avatarUrl ? (
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-black text-xs font-bold uppercase shadow-sm">
                  {authUser?.name ? authUser.name.charAt(0) : <User className="w-4 h-4" />}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-neutral-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div 
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#09090b] border border-orange-500/30 shadow-2xl py-2 z-50 text-xs font-mono backdrop-blur-2xl"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-3.5 py-2.5 border-b border-neutral-800/80">
                  <p className="font-bold text-white truncate">
                    {authUser?.name || 'Local Vault Master'}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {authUser?.email || 'Encrypted Session'}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    AUTH_NODE: {authUser?.provider || 'local_vault'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSupabaseModal();
                  }}
                  className="w-full text-left px-3.5 py-2 text-neutral-300 hover:bg-neutral-800/80 hover:text-orange-400 flex items-center gap-2 transition"
                >
                  <Database className="w-3.5 h-3.5 text-orange-500" />
                  Supabase & Cloud Sync
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenPassphraseModal();
                  }}
                  className="w-full text-left px-3.5 py-2 text-neutral-300 hover:bg-neutral-800/80 hover:text-orange-400 flex items-center gap-2 transition"
                >
                  <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                  AES-256 Key Settings
                </button>

                <div className="border-t border-neutral-800 my-1" />

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out / Reset Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
