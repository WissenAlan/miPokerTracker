import React from 'react';
import { Wallet, TrendingUp, Gift, Flame, Clock, Trophy, ArrowUpRight, ArrowDownRight, ArrowDownLeft } from 'lucide-react';

export default function KPICards({ sessions }) {
  if (!sessions || sessions.length === 0) return null;

  const latest = sessions[sessions.length - 1];
  const bancaActual = latest.banca || 0;
  const gananciaTotal = latest.ganancia || 0;

  let totalManos = 0;
  let totalMinutos = 0;
  let totalRecompensas = 0;
  let totalDepositos = 0;
  let totalRetiros = 0;
  let sesionesCount = 0;

  sessions.forEach(s => {
    totalManos += s.cantManos || 0;
    totalMinutos += s.minutos || 0;
    if (s.tipo === 'recompensa') totalRecompensas += (s.deltaBanca || 0);
    if (s.tipo === 'deposito') totalDepositos += (s.deltaBanca || 0);
    if (s.tipo === 'retiro') totalRetiros += Math.abs(s.deltaBanca || 0);
    if (s.tipo === 'sesion') sesionesCount++;
  });

  const totalHoras = totalMinutos > 0 ? (totalMinutos / 60) : 0;
  const gananciaHora = totalHoras > 0 ? (gananciaTotal / totalHoras) : 0;
  const beneficioNetoTotal = Number((bancaActual - totalDepositos + totalRetiros).toFixed(2));

  const cards = [
    {
      title: 'Banca Actual',
      value: `$${bancaActual.toFixed(2)}`,
      subtitle: `Entrada: $${totalDepositos.toFixed(2)} (Neto: +$${beneficioNetoTotal.toFixed(2)})`,
      icon: Wallet,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      title: 'Ganancia en Mesas',
      value: `${gananciaTotal >= 0 ? '+' : ''}$${gananciaTotal.toFixed(2)}`,
      subtitle: 'Beneficio neto en juego',
      icon: TrendingUp,
      color: gananciaTotal >= 0 ? 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400' : 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400'
    },
    {
      title: 'Recompensas / Cofres',
      value: `+$${totalRecompensas.toFixed(2)}`,
      subtitle: 'Stars Rewards & Rakeback',
      icon: Gift,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400'
    },
    {
      title: 'Volumen de Manos',
      value: totalManos.toLocaleString(),
      subtitle: `Promedio: ${sesionesCount > 0 ? Math.round(totalManos / sesionesCount) : 0} manos/sesión`,
      icon: Flame,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400'
    },
    {
      title: 'Tiempo en Mesas',
      value: `${totalHoras.toFixed(1)} h`,
      subtitle: `${totalMinutos.toLocaleString()} minutos jugados`,
      icon: Clock,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
    },
    {
      title: 'Rendimiento / Hora',
      value: `${gananciaHora >= 0 ? '+' : ''}$${gananciaHora.toFixed(2)}/h`,
      subtitle: 'Ganancia horaria en juego',
      icon: Trophy,
      color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30 text-cyan-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-2xl bg-gradient-to-br ${c.color} border backdrop-blur-md shadow-lg transition-all hover:scale-[1.02] flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{c.title}</span>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-white mb-1">{c.value}</div>
              <div className="text-xs text-slate-400 truncate">{c.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
