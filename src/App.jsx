import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Gift,
  RefreshCw,
  FolderSearch,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Activity,
  Flame
} from 'lucide-react';

import KPICards from './components/KPICards';
import EvolutionChart from './components/EvolutionChart';
import SessionTable from './components/SessionTable';
import AddSessionModal from './components/AddSessionModal';
import AddRewardModal from './components/AddRewardModal';
import PokerStarsSyncModal from './components/PokerStarsSyncModal';

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStake, setSelectedStake] = useState('ALL'); // 'ALL' | 'NL2' | 'NL5'

  // Live PokerStars status
  const [liveStatus, setLiveStatus] = useState(null);

  // Modals state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data || []);
      } else {
        setError(data.message || 'Error cargando datos');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor local');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch('/api/pokerstars/live');
      const data = await res.json();
      if (data.success) {
        setLiveStatus(data);
        if (data.isPlaying) {
          // If playing, refresh sessions quietly
          fetchSessions();
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSessions();
    fetchLiveStatus();

    // Auto-polling every 10 seconds for live updates while playing PokerStars
    const interval = setInterval(() => {
      fetchLiveStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleDeleteSession = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro? Los saldos posteriores se recalcularán automáticamente.')) {
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (err) {
      alert('Error eliminando sesión: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Version */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-950 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl">♠</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  miPokerTracker
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Seguimiento de Banca & PokerStars</p>
            </div>
          </div>

          {/* Center: Live Playing Badge if PokerStars active */}
          {liveStatus && liveStatus.isPlaying && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-pulse shadow-lg shadow-emerald-950/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              <span className="font-semibold">PokerStars en juego:</span>
              <span className="font-mono">{liveStatus.todayHands} manos hoy</span>
              <span className={`font-mono font-bold ${liveStatus.todayProfit >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                ({liveStatus.todayProfit >= 0 ? '+' : ''}${liveStatus.todayProfit.toFixed(2)})
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Sync PokerStars */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
              title="Abrir sincronizador de PokerStars"
            >
              <span className={`w-2 h-2 rounded-full ${liveStatus?.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`}></span>
              <FolderSearch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PokerStars</span>
            </button>

            {/* Add Reward / Chest */}
            <button
              onClick={() => setIsRewardModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Gift className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cofre / Retiro</span>
            </button>

            {/* Add Manual Session */}
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sesión</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => { fetchSessions(); fetchLiveStatus(); }}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchSessions}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* 1. Metric Cards with Stake Selection */}
            <KPICards sessions={sessions} selectedStake={selectedStake} />

            {/* 2. Interactive Evolution Chart with Milestone and Stake Filters */}
            <EvolutionChart
              sessions={sessions}
              selectedStake={selectedStake}
              onSelectStake={setSelectedStake}
            />

            {/* 3. Detailed Sessions Table with Stake Badges & Filters */}
            <SessionTable sessions={sessions} onDeleteSession={handleDeleteSession} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>miPokerTracker v2.0 • Stack: Node.js, React 18, Tailwind CSS & Recharts</div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hito NL5 activo (desde 30/09/2026) • Auto-Sync PokerStars</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSessionAdded={fetchSessions}
      />

      <AddRewardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        onRewardAdded={fetchSessions}
      />

      <PokerStarsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onImportCompleted={fetchSessions}
      />
    </div>
  );
}
