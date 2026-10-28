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
  ResponsiveContainer
} from 'recharts';
import { LineChart as LineChartIcon, BarChart3, Calendar, DollarSign, Layers } from 'lucide-react';

export default function EvolutionChart({ sessions }) {
  const [metric, setMetric] = useState('banca'); // 'banca' | 'ganancia' | 'manos'
  const [range, setRange] = useState('ALL'); // '7D' | '30D' | '90D' | 'ALL'

  // Filter by range
  const filteredData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    let data = [...sessions];
    if (range === 'ALL') return data;

    const count = range === '7D' ? 7 : range === '30D' ? 30 : 90;
    return data.slice(Math.max(0, data.length - count));
  }, [sessions, range]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 mb-2 flex items-center justify-between gap-4">
            <span>{item.fecha}</span>
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

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Chart Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-emerald-400" />
            Evolución del Rendimiento
          </h2>
          <p className="text-xs text-slate-400">
            Seguimiento interactivo de tu progreso y volumen de manos
          </p>
        </div>

        {/* View and Range Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetric('banca')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                isBanca ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Banca Total
            </button>
            <button
              onClick={() => setMetric('ganancia')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                isGanancia ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ganancia Juego
            </button>
            <button
              onClick={() => setMetric('manos')}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                metric === 'manos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
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
                className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                  range === r ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'ALL' ? 'Todo' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metric === 'manos' ? (
            <BarChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cantManos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
