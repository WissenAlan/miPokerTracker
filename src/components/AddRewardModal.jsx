import React, { useState } from 'react';
import { X, Gift, ArrowDownCircle, ArrowUpCircle, Calendar, DollarSign } from 'lucide-react';

export default function AddRewardModal({ isOpen, onClose, onRewardAdded }) {
  const today = new Date();
  const defaultFecha = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const [tipo, setTipo] = useState('recompensa'); // 'recompensa' | 'retiro' | 'deposito'
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(defaultFecha);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto) return;

    setLoading(true);
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          monto: parseFloat(monto),
          fecha,
          notas: notas || (tipo === 'recompensa' ? 'Cofre Stars Rewards' : tipo === 'retiro' ? 'Retiro de banca' : 'Depósito a cuenta')
        })
      });

      const data = await res.json();
      if (data.success) {
        onRewardAdded();
        onClose();
        setMonto('');
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
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Movimiento de Banca</h3>
              <p className="text-xs text-slate-400">Cofre, rakeback, depósito o retiro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Movement Type Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTipo('recompensa')}
              className={`py-2 rounded-lg font-medium transition-all ${
                tipo === 'recompensa' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cofre / Bonus
            </button>
            <button
              type="button"
              onClick={() => setTipo('retiro')}
              className={`py-2 rounded-lg font-medium transition-all ${
                tipo === 'retiro' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Retiro (-)
            </button>
            <button
              type="button"
              onClick={() => setTipo('deposito')}
              className={`py-2 rounded-lg font-medium transition-all ${
                tipo === 'deposito' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Depósito (+)
            </button>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Monto ($)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                required
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="Ej: 0.50, 5.00, 50.00"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Fecha (DD/MM/AAAA)</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Concepto / Notas (Opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Cofre Stars Rewards bronce, Rakeback semanal"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
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
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-900/40 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
