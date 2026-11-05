import React, { useState, useEffect } from 'react';
import { X, Edit3, Calendar, DollarSign, Clock, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function EditSessionModal({ session, prevBanca = 0, isOpen, onClose, onSessionUpdated }) {
  const [fecha, setFecha] = useState('');
  const [banca, setBanca] = useState('');
  const [deltaBanca, setDeltaBanca] = useState('');
  const [cantManos, setCantManos] = useState('');
  const [minutos, setMinutos] = useState('');
  const [stake, setStake] = useState('NL5');
  const [notas, setNotas] = useState('');
  const [mode, setMode] = useState('banca'); // 'banca' (por saldo final) | 'delta' (por resultado)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session) {
      setFecha(session.fecha || '');
      setBanca(session.banca !== undefined ? session.banca.toString() : '');
      setDeltaBanca(session.deltaBanca !== undefined ? session.deltaBanca.toString() : '');
      setCantManos(session.cantManos !== undefined ? session.cantManos.toString() : '');
      setMinutos(session.minutos !== undefined ? session.minutos.toString() : '');
      setStake(session.stake || 'NL5');
      setNotas(session.notas || '');
      setError(null);
    }
  }, [session]);

  if (!isOpen || !session) return null;

  // Cuando cambia el saldo final deseado en cajero
  const handleBancaChange = (val) => {
    setBanca(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const calcDelta = Number((num - prevBanca).toFixed(2));
      setDeltaBanca(calcDelta.toString());
    }
  };

  // Cuando cambia el delta/resultado
  const handleDeltaChange = (val) => {
    setDeltaBanca(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const calcBanca = Number((prevBanca + num).toFixed(2));
      setBanca(calcBanca.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = {
        fecha,
        cantManos: parseInt(cantManos, 10) || 0,
        minutos: parseInt(minutos, 10) || 0,
        stake,
        notas
      };

      if (mode === 'banca' && banca !== '') {
        body.banca = parseFloat(banca);
      } else if (deltaBanca !== '') {
        body.deltaBanca = parseFloat(deltaBanca);
        body.deltaGanancia = parseFloat(deltaBanca);
      }

      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        onSessionUpdated();
        onClose();
      } else {
        setError(data.message || 'Error al actualizar sesión');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Sesión</h3>
              <p className="text-xs text-slate-400">
                Ajustar saldo o resultado de la sesión ({session.fecha})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Mode selector */}
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('banca')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
                mode === 'banca'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fijar saldo final en cajero ($)
            </button>
            <button
              type="button"
              onClick={() => setMode('delta')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
                mode === 'delta'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fijar resultado / profit ($)
            </button>
          </div>

          {/* Saldo y Delta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Saldo final en cajero ($)
                {mode === 'banca' && <span className="text-blue-400 ml-1">★ Activo</span>}
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={banca}
                  onChange={e => handleBancaChange(e.target.value)}
                  placeholder="Ej: 158.34"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border text-slate-100 font-mono focus:outline-none ${
                    mode === 'banca' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Saldo antes de esta sesión: ${prevBanca.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Resultado / Profit ($)
                {mode === 'delta' && <span className="text-blue-400 ml-1">★ Activo</span>}
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={deltaBanca}
                  onChange={e => handleDeltaChange(e.target.value)}
                  placeholder="Ej: -5.59 o +3.20"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border font-mono focus:outline-none ${
                    mode === 'delta' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'
                  } ${parseFloat(deltaBanca) >= 0 ? 'text-green-400' : 'text-rose-400'}`}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Diferencia en tu banca
              </span>
            </div>
          </div>

          {/* Manos y Minutos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Cantidad de manos</label>
              <input
                type="number"
                value={cantManos}
                onChange={e => setCantManos(e.target.value)}
                placeholder="Ej: 485"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Duración (minutos)</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={minutos}
                  onChange={e => setMinutos(e.target.value)}
                  placeholder="Ej: 90"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Stake & Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nivel (Stake)</label>
              <select
                value={stake}
                onChange={e => setStake(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="NL5">NL5 ($0.02/$0.05)</option>
                <option value="NL2">NL2 ($0.01/$0.02)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Fecha</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Notas / Motivo del ajuste</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Ajustado a saldo real de cajero"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-all shadow-lg shadow-blue-950 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
