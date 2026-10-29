import React from 'react';
import { Wallet, TrendingUp, Gift, Flame, Clock, Trophy, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export default function KPICards({ sessions, selectedStake = 'ALL' }) {
  if (!sessions || sessions.length === 0) return null;

  const latest = sessions[sessions.length - 1];
  const bancaActual = latest.banca || 0;

  // Filter sessions if a specific stake is selected
  const activeSessions = sessions.filter(s => {
    if (selectedStake === 'ALL') return true;
    if (selectedStake === 'NL2') return s.stake === 'NL2';
    if (selectedStake === 'NL5') return s.stake === 'NL5';
    return true;
  });

  let totalManos = 0;
  let totalMinutos = 0;
  let gananciaFiltrada = 0;
  let totalRecompensas = 0;
  let totalDepositos = 0;
  let totalRetiros = 0;
  let sesionesCount = 0;

  activeSessions.forEach(s => {
    totalManos += s.cantManos || 0;
    totalMinutos += s.minutos || 0;
    if (s.tipo === 'sesion') {
      gananciaFiltrada += (s.deltaGanancia || 0);
      sesionesCount++;
    }
    if (selectedStake === 'ALL') {
      if (s.tipo === 'recompensa') totalRecompensas += (s.deltaBanca || 0);
      if (s.tipo === 'deposito') totalDepositos += (s.deltaBanca || 0);
      if (s.tipo === 'retiro') totalRetiros += Math.abs(s.deltaBanca || 0);
    }
  });

  const totalHoras = totalMinutos > 0 ? (totalMinutos / 60) : 0;
  const gananciaHora = totalHoras > 0 ? (gananciaFiltrada / totalHoras) : 0;
  const beneficioNetoTotal = Number((bancaActual - totalDepositos + totalRetiros).toFixed(2));

  const isFiltered = selectedStake !== 'ALL';

  const cards = [
    {
      title: isFiltered ? `Nivel Seleccionado` : 'Banca Actual',
      value: isFiltered ? (selectedStake === 'NL5' ? 'NL5 ($5)' : 'NL2 ($2)') : `$${bancaActual.toFixed(2)}`,
      subtitle: isFiltered ? `${sesionesCount} sesiones en este nivel` : `Entrada: $${totalDepositos.toFixed(2)} (Neto: +$${beneficioNetoTotal.toFixed(2)})`,
      icon: isFiltered ? Layers : Wallet,
      color: isFiltered
        ? (selectedStake === 'NL5' ? 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400' : 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400')
        : 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      title: isFiltered ? `Ganancia ${selectedStake}` : 'Ganancia en Mesas',
      value: `${gananciaFiltrada >= 0 ? '+' : ''}$${gananciaFiltrada.toFixed(2)}`,
      subtitle: isFiltered ? `Beneficio neto en ${selectedStake}` : 'Beneficio neto en juego',
      icon: TrendingUp,
      color: gananciaFiltrada >= 0 ? 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400' : 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400'
    },
    {
      title: isFiltered ? `Winrate ${selectedStake}` : 'Recompensas / Cofres',
      value: isFiltered
        ? `${gananciaHora >= 0 ? '+' : ''}$${gananciaHora.toFixed(2)}/h`
        : `+$${totalRecompensas.toFixed(2)}`,
      subtitle: isFiltered ? 'Rendimiento en este nivel' : 'Stars Rewards & Rakeback',
      icon: isFiltered ? Trophy : Gift,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400'
    },
    {
      title: isFiltered ? `Manos en ${selectedStake}` : 'Volumen de Manos',
      value: totalManos.toLocaleString(),
      subtitle: `Promedio: ${sesionesCount > 0 ? Math.round(totalManos / sesionesCount) : 0} manos/sesión`,
      icon: Flame,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400'
    },
    {
      title: isFiltered ? `Horas en ${selectedStake}` : 'Tiempo en Mesas',
      value: `${totalHoras.toFixed(1)} h`,
      subtitle: `${totalMinutos.toLocaleString()} minutos jugados`,
      icon: Clock,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
    },
    {
      title: isFiltered ? 'bb / 100 Estimado' : 'Rendimiento / Hora',
      value: isFiltered
        ? (selectedStake === 'NL5'
            ? `${totalManos > 0 ? ((gananciaFiltrada / 0.05) / (totalManos / 100)).toFixed(1) : 0} bb/100`
            : `${totalManos > 0 ? ((gananciaFiltrada / 0.02) / (totalManos / 100)).toFixed(1) : 0} bb/100`)
        : `${gananciaHora >= 0 ? '+' : ''}$${gananciaHora.toFixed(2)}/h`,
      subtitle: isFiltered ? 'Ciegas ganadas por 100 manos' : 'Ganancia horaria en juego',
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
