import React, { useState, useEffect } from 'react';
import { X, RefreshCw, FolderSearch, ClipboardList, CheckCircle2, AlertCircle, Sparkles, User, FileText } from 'lucide-react';

export default function PokerStarsSyncModal({ isOpen, onClose, onImportCompleted }) {
  const [tab, setTab] = useState('folder'); // 'folder' | 'paste' | 'config'
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Paste mode
  const [rawText, setRawText] = useState('');
  const [pastedAnalysis, setPastedAnalysis] = useState(null);

  // Config
  const [pokerstarsDir, setPokerstarsDir] = useState('');
  const [heroName, setHeroName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/pokerstars/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        setPokerstarsDir(data.path || '');
        setHeroName(data.heroName || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncFolder = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/pokerstars/sync', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      if (data.success && data.importedHands > 0) {
        onImportCompleted();
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
      fetchStatus();
    }
  };

  const handleAnalyzePasted = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setPastedAnalysis(null);
    try {
      const res = await fetch('/api/pokerstars/parse-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, heroName })
      });
      const data = await res.json();
      if (data.success) {
        setPastedAnalysis(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPastedAsSession = async () => {
    if (!pastedAnalysis || !pastedAnalysis.summary) return;
    const s = pastedAnalysis.summary;
    setLoading(true);
    try {
      const today = new Date();
      const fecha = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          deltaGanancia: s.totalProfit,
          cantManos: s.totalHands,
          minutos: Math.round(s.totalHands * 0.35), // Est. ~100 manos / 35 min
          notas: `PokerStars import (${s.stakes ? `$${s.stakes.sb}/$${s.stakes.bb}` : 'Cash'}) - VPIP: ${s.vpipPct}%, PFR: ${s.pfrPct}%`
        })
      });
      const data = await res.json();
      if (data.success) {
        onImportCompleted();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokerstarsDir, heroName })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        fetchStatus();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <FolderSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sincronización con PokerStars
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">Importar historiales de manos directamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTab('folder')}
            className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'folder' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            Carpeta Automática
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'paste' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Pegar Texto / Test
          </button>
          <button
            onClick={() => setTab('config')}
            className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'config' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Configuración
          </button>
        </div>

        {/* Tab 1: Folder Auto Sync */}
        {tab === 'folder' && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-slate-400 block mb-1">Ruta detectada en tu PC:</span>
                  <span className="font-mono text-slate-200 text-[11px] break-all">{status?.path || 'Cargando...'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {status?.exists ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conectada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" /> No encontrada
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-slate-400">
                Archivos .txt detectados: <span className="font-bold text-white">{status?.filesCount || 0}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
              <span className="font-semibold block mb-0.5">Nota sobre PokerStars:</span>
              PokerStars guarda automáticamente las manos mientras juegas si tienes activada la opción en:{' '}
              <span className="underline font-medium">Settings &gt; Playing History &gt; Hand History &gt; Save My Hand History</span>.
            </div>

            {result && (
              <div className={`p-3 rounded-xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                {result.message || `¡Importación exitosa! ${result.importedHands} manos procesadas.`}
              </div>
            )}

            <button
              onClick={handleSyncFolder}
              disabled={loading || !status?.exists}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Escaneando archivos...' : 'Escanear e Importar Manos'}
            </button>
          </div>
        )}

        {/* Tab 2: Paste Raw Text */}
        {tab === 'paste' && (
          <div className="mt-4 space-y-3 text-xs">
            <p className="text-slate-400">
              Puedes copiar y pegar aquí el texto de cualquier mano o historial de PokerStars para probar el parser y calcular estadísticas instantáneas:
            </p>
            <textarea
              rows={6}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Pega aquí el contenido que empieza con 'PokerStars Hand #...'..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleAnalyzePasted}
              disabled={loading || !rawText.trim()}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Analizando...' : 'Analizar Texto'}
            </button>

            {pastedAnalysis && pastedAnalysis.summary && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span>Resultado del Análisis</span>
                  <span className="text-white font-mono">{pastedAnalysis.handsCount} manos detectadas</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Jugador detectado: <span className="font-bold text-white">{pastedAnalysis.summary.hero}</span></div>
                  <div>
                    Resultado neto:{' '}
                    <span className={`font-mono font-bold ${pastedAnalysis.summary.totalProfit >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      {pastedAnalysis.summary.totalProfit >= 0 ? '+' : ''}${pastedAnalysis.summary.totalProfit.toFixed(2)}
                    </span>
                  </div>
                  <div>VPIP: <span className="font-bold text-white">{pastedAnalysis.summary.vpipPct}%</span></div>
                  <div>PFR: <span className="font-bold text-white">{pastedAnalysis.summary.pfrPct}%</span></div>
                  <div>Went to Showdown: <span className="font-bold text-white">{pastedAnalysis.summary.showdownPct}%</span></div>
                  <div>Won at Showdown: <span className="font-bold text-white">{pastedAnalysis.summary.wtsdWinPct}%</span></div>
                </div>

                <button
                  onClick={handleAddPastedAsSession}
                  disabled={loading}
                  className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  Agregar como Sesión al Tracker
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Configuration */}
        {tab === 'config' && (
          <form onSubmit={handleSaveConfig} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Ruta de Carpeta HandHistory</label>
              <input
                type="text"
                required
                value={pokerstarsDir}
                onChange={e => setPokerstarsDir(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Por defecto: C:\Users\&lt;Usuario&gt;\AppData\Local\PokerStars\HandHistory\
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Nombre de Usuario en PokerStars (Hero)</label>
              <input
                type="text"
                value={heroName}
                onChange={e => setHeroName(e.target.value)}
                placeholder="Ej: MiNickEnStars (dejar vacío para autodetección)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Si lo dejas vacío, el tracker detecta automáticamente a quién le repartieron cartas ("Dealt to ...").
              </span>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-center">
                ¡Configuración guardada correctamente!
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              Guardar Configuración
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
