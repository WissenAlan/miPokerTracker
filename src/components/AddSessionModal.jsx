import React, { useState } from 'react';
import { X, Plus, Calendar, DollarSign, Flame, Clock } from 'lucide-react';

export default function AddSessionModal({ isOpen, onClose, onSessionAdded }) {
  const today = new Date();
  const defaultFecha = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const [fecha, setFecha] = useState(defaultFecha);
  const [deltaGanancia, setDeltaGanancia] = useState('');
  const [cantManos, setCantManos] = useState('');
  const [minutos, setMinutos] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deltaGanancia) return;

    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          deltaGanancia: parseFloat(deltaGanancia),
          cantManos: parseInt(cantManos, 10) || 0,
          minutos: parseInt(minutos, 10) || 0,
          notas
        })
      });

      const data = await res.json();
      if (data.success) {
        onSessionAdded();
        onClose();
        setDeltaGanancia('');
        setCantManos('');
        setMinutos('');
        setNotas('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nueva Sesión Manual</h3>
              <p className="text-xs text-slate-400">Registrar sesión de juego en mesas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Fecha (DD/MM/AAAA)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                placeholder="28/10/2026"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Resultado de la Sesión ($)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                required
                value={deltaGanancia}
                onChange={e => setDeltaGanancia(e.target.value)}
                placeholder="Ej: +4.50 o -2.10"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Usa valor positivo para ganancia y negativo para pérdida
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Cantidad de Manos</label>
              <div className="relative">
                <Flame className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={cantManos}
                  onChange={e => setCantManos(e.target.value)}
                  placeholder="Ej: 350"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Minutos Jugados</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={minutos}
                  onChange={e => setMinutos(e.target.value)}
                  placeholder="Ej: 60"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Notas / Modalidad (Opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: NL2 Zoom 4 mesas - buen foco"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/40 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
