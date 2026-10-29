import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { LineChart as LineChartIcon, BarChart3, Calendar, DollarSign, Layers, Sparkles } from 'lucide-react';

export default function EvolutionChart({ sessions, selectedStake, onSelectStake }) {
  const [metric, setMetric] = useState('banca'); // 'banca' | 'ganancia' | 'manos'
  const [range, setRange] = useState('ALL'); // '7D' | '30D' | '90D' | 'ALL'

  // Filter by stake and range
  const filteredData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    let data = sessions.filter(s => {
      if (selectedStake === 'ALL') return true;
      if (selectedStake === 'NL2') return s.stake === 'NL2';
      if (selectedStake === 'NL5') return s.stake === 'NL5';
      return true;
    });

    if (range === 'ALL') return data;
    const count = range === '7D' ? 7 : range === '30D' ? 30 : 90;
    return data.slice(Math.max(0, data.length - count));
  }, [sessions, range, selectedStake]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span>{item.fecha}</span>
              {item.stake && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  item.stake === 'NL5' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {item.stakeLabel || item.stake}
                </span>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
              item.tipo === 'sesion' ? 'bg-emerald-500/20 text-emerald-300' :
              item.tipo === 'recompensa' ? 'bg-amber-500/20 text-amber-300' :
              item.tipo === 'deposito' ? 'bg-blue-500/20 text-blue-300' :
              'bg-rose-500/20 text-rose-300'
            }`}>
              {item.tipo}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Banca Acumulada:</span>
              <span className="font-mono font-semibold text-emerald-400">${item.banca.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Ganancia en Juego:</span>
              <span className={`font-mono font-semibold ${item.ganancia >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                {item.ganancia >= 0 ? '+' : ''}${item.ganancia.toFixed(2)}
              </span>
            </div>
            {item.tipo === 'sesion' ? (
              <>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">Resultado Sesión:</span>
                  <span className={`font-mono font-bold ${item.deltaGanancia >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                    {item.deltaGanancia >= 0 ? '+' : ''}${item.deltaGanancia.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-400">Manos / Duración:</span>
                  <span className="text-slate-300">{item.cantManos} manos ({item.minutos} min)</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Monto Movimiento:</span>
                <span className={`font-mono font-bold ${item.tipo === 'deposito' ? 'text-blue-400' : item.deltaBanca >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {item.deltaBanca >= 0 ? '+' : ''}${item.deltaBanca.toFixed(2)}
                </span>
              </div>
            )}
            {item.notas && (
              <div className="pt-1 mt-1 border-t border-slate-800 text-[10px] text-slate-400 italic">
                {item.notas}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const isBanca = metric === 'banca';
  const isGanancia = metric === 'ganancia';

  // Mostrar la línea de hito de subida de nivel solo si la fecha 30/09/2026 está presente en los datos
  const hasMilestoneDate = filteredData.some(d => d.fecha === '30/09/2026');

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Chart Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-emerald-400" />
              Evolución del Rendimiento
            </h2>
            {/* Stake Indicator Tag */}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {selectedStake === 'ALL' ? 'Todos los Niveles' : selectedStake === 'NL2' ? 'Mesas $2 (NL2)' : 'Mesas $5 (NL5)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Seguimiento interactivo de tu banca, beneficios y el hito de subida a NL5 el 30/09
          </p>
        </div>

        {/* View, Stake, and Range Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level / Stake Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => onSelectStake('ALL')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                selectedStake === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onSelectStake('NL2')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
                selectedStake === 'NL2' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              NL2 ($2)
            </button>
            <button
              onClick={() => onSelectStake('NL5')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
                selectedStake === 'NL5' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
              NL5 ($5)
            </button>
          </div>

          {/* Metric Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetric('banca')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                isBanca ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Banca
            </button>
            <button
              onClick={() => setMetric('ganancia')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                isGanancia ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ganancia
            </button>
            <button
              onClick={() => setMetric('manos')}
              className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                metric === 'manos' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Manos
            </button>
          </div>

          {/* Range Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            {['7D', '30D', '90D', 'ALL'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-1.5 rounded-lg transition-all font-medium ${
                  range === r ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'ALL' ? 'Todo' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Milestone info banner if milestone in view */}
      {selectedStake === 'ALL' && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-xs flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Hito de Subida de Nivel (30/09/2026)</strong>: Pasaste de mesas de $2 (NL2) a mesas de $5 (NL5).
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] text-amber-400 font-mono">
            NL2: +$79.22 | NL5: +$22.50
          </span>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metric === 'manos' ? (
            <BarChart data={filteredData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {hasMilestoneDate && selectedStake === 'ALL' && (
                <ReferenceLine
                  x="30/09/2026"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: "🚀 Subida a NL5 ($5)", position: "top", fill: "#fbbf24", fontSize: 11, fontWeight: "bold" }}
                />
              )}
              <Bar dataKey="cantManos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={filteredData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBanca" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={val => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMilestoneDate && selectedStake === 'ALL' && (
                <ReferenceLine
                  x="30/09/2026"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: "🚀 Subida a NL5 ($5)", position: "top", fill: "#fbbf24", fontSize: 11, fontWeight: "bold" }}
                />
              )}
              <Area
                type="monotone"
                dataKey={isBanca ? 'banca' : 'ganancia'}
                stroke={isBanca ? '#10b981' : '#22c55e'}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${isBanca ? 'colorBanca' : 'colorGanancia'})`}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
