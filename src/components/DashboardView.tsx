import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  MessageSquare, 
  ShieldCheck, 
  Database, 
  Clock, 
  Trash2, 
  Download, 
  Search,
  Activity,
  Terminal,
  Cpu,
  Layers,
  PieChart
} from 'lucide-react';
import { ChatThread, ActivityLog, Folder, SupabaseConfig } from '../types';

interface DashboardViewProps {
  threads: ChatThread[];
  folders: Folder[];
  logs: ActivityLog[];
  supabaseConfig: SupabaseConfig;
  onClearLogs: () => void;
  onExportAuditLog: () => void;
  onNavigateToThread: (threadId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  threads,
  folders,
  logs,
  supabaseConfig,
  onClearLogs,
  onExportAuditLog,
  onNavigateToThread,
}) => {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');

  // Calculate metrics
  const totalMessages = useMemo(() => {
    return threads.reduce((acc, t) => acc + (t.messageCount || t.messages.length), 0);
  }, [threads]);

  const totalBytesEstimated = useMemo(() => {
    const raw = JSON.stringify(threads);
    return Math.round((new Blob([raw]).size) / 1024 * 1.4);
  }, [threads]);

  const syncedCount = useMemo(() => {
    return threads.filter(t => t.syncedToSupabase).length;
  }, [threads]);

  // Platform distribution
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {
      whatsapp: 0,
      telegram: 0,
      chatgpt: 0,
      slack: 0,
      imessage: 0,
      custom: 0,
    };
    threads.forEach(t => {
      counts[t.platform] = (counts[t.platform] || 0) + t.messages.length;
    });
    return counts;
  }, [threads]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchFilter = logFilter === 'all' || log.action === logFilter;
      const matchSearch =
        !logSearch.trim() ||
        log.title.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.description.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.device.toLowerCase().includes(logSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [logs, logFilter, logSearch]);

  const getActionColor = (action: ActivityLog['action']) => {
    switch (action) {
      case 'encrypt':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'sync':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'append':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'extract':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'export':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-[#050507] p-4 sm:p-6 lg:p-8 space-y-6 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-500/20 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-orange-500 text-2xl">monitoring</span>
            <span>SYSTEM_TELEMETRY // AUDIT_LOGS</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5 font-mono">
            Realtime encrypted storage footprint, cross-node synchronization, and AI audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportAuditLog}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#101014] text-orange-400 border border-orange-500/30 hover:bg-neutral-900 transition glow-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT_AUDIT_LOG</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Messages */}
        <div className="p-4 rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-lg glow-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">TOTAL_MESSAGES</span>
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {totalMessages.toLocaleString()}
            </span>
            <span className="text-xs text-orange-400 font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> 100% deduplicated
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Across {threads.length} chat threads</p>
        </div>

        {/* Card 2: Encrypted Storage at Rest */}
        <div className="p-4 rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-lg glow-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">ENCRYPTED_AT_REST</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {totalBytesEstimated} KB
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
              AES_GCM
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">PBKDF2 SHA-256 derived cipher</p>
        </div>

        {/* Card 3: Supabase Sync Status */}
        <div className="p-4 rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-lg glow-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">SUPABASE_CLOUD</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {supabaseConfig.isConnected ? `${syncedCount}/${threads.length}` : 'LOCAL'}
            </span>
            <span className="text-xs text-blue-400 font-bold">
              {supabaseConfig.isConnected ? 'CONNECTED' : 'STANDALONE'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            {supabaseConfig.autoSync ? 'Realtime auto-sync active' : 'Manual sync mode'}
          </p>
        </div>

        {/* Card 4: Active Contacts */}
        <div className="p-4 rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-lg glow-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">ACTIVE_THREADS</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {threads.length}
            </span>
            <span className="text-xs text-purple-400 font-bold">
              {folders.length} FOLDERS
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Cross-platform channels</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Volume Distribution */}
        <div className="p-5 rounded-2xl bg-[#09090c] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
              <PieChart className="w-4 h-4 text-orange-500" />
              <span>PLATFORM_DISTRIBUTION</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">Msgs</span>
          </div>

          <div className="space-y-3">
            {[
              { key: 'whatsapp', label: 'WhatsApp', color: 'bg-emerald-500', count: platformStats.whatsapp },
              { key: 'telegram', label: 'Telegram', color: 'bg-sky-500', count: platformStats.telegram },
              { key: 'chatgpt', label: 'ChatGPT / AI', color: 'bg-orange-500', count: platformStats.chatgpt },
              { key: 'slack', label: 'Slack', color: 'bg-purple-500', count: platformStats.slack },
            ].map(item => {
              const pct = totalMessages > 0 ? Math.round((item.count / totalMessages) * 100) : 0;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-300">{item.label}</span>
                    <span className="text-neutral-400">{item.count} msgs ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Active Chat Threads */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#09090c] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              TOP_CHANNELS_IN_VAULT
            </h3>
            <span className="text-[11px] text-neutral-400">Volume</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {threads.slice(0, 4).map(thread => (
              <div
                key={thread.id}
                onClick={() => onNavigateToThread(thread.id)}
                className="group p-3 rounded-xl border border-neutral-800 bg-[#0d0d12] hover:border-orange-500/50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {thread.featureImage ? (
                    <img
                      src={thread.featureImage}
                      alt={thread.contactName}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-black font-bold flex-shrink-0">
                      {thread.contactName.charAt(0)}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition font-sans">
                      {thread.customAlias || thread.contactName}
                    </p>
                    <p className="text-[10px] text-neutral-400 capitalize">
                      {thread.platform} • {thread.tags[0] || 'untagged'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-white">
                    {thread.messageCount}
                  </span>
                  <p className="text-[9px] text-neutral-400">msgs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="p-5 rounded-2xl bg-[#09090c] border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>REALTIME_ACTIVITY_STREAM</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cryptographic audit log of all extractions, bulk tagging, and sync events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search in logs */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-500" />
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-800 bg-[#121216] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Clear Logs */}
            <button
              onClick={() => {
                if (confirm('Clear audit logs? (Your chat data will remain safe)')) {
                  onClearLogs();
                }
              }}
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded-lg transition"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'extract', 'append', 'sync', 'encrypt', 'export'] as const).map(action => (
            <button
              key={action}
              onClick={() => setLogFilter(action)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition border ${
                logFilter === action
                  ? 'bg-orange-500 text-black border-orange-500 glow-orange font-extrabold'
                  : 'bg-black text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {action === 'all' ? 'All Events' : action}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-neutral-900">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No activity logs match your filter.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                    <div>
                      <p className="font-bold text-white font-sans">
                        {log.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 text-[10px] text-neutral-400 space-y-0.5">
                    <p>{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                    <p className="text-neutral-500">{log.device}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
