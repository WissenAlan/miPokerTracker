import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit3, Download, ArrowUpDown, ChevronLeft, ChevronRight, Calendar, DollarSign, Layers } from 'lucide-react';

export default function SessionTable({ sessions, onDeleteSession, onEditSession }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'NL2' | 'NL5' | 'sesion' | 'recompensa' | 'movimientos'
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter(s => {
        if (filterType === 'NL2' && s.stake !== 'NL2') return false;
        if (filterType === 'NL5' && s.stake !== 'NL5') return false;
        if (filterType === 'recompensa' && s.tipo !== 'recompensa') return false;
        if (filterType === 'movimientos' && s.tipo !== 'deposito' && s.tipo !== 'retiro') return false;

        if (search) {
          const q = search.toLowerCase();
          const matchFecha = s.fecha && s.fecha.toLowerCase().includes(q);
          const matchNotas = s.notas && s.notas.toLowerCase().includes(q);
          const matchTipo = s.tipo && s.tipo.toLowerCase().includes(q);
          const matchStake = s.stake && s.stake.toLowerCase().includes(q);
          return matchFecha || matchNotas || matchTipo || matchStake;
        }
        return true;
      })
      .slice()
      .reverse(); // Most recent first
  }, [sessions, filterType, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (!sessions || sessions.length === 0) return;
    const headers = ['Fecha', 'Nivel', 'Tipo', 'Manos', 'Minutos', 'Banca Acumulada', 'Ganancia Juego', 'Delta Saldo', 'Delta Ganancia', 'Fuente', 'Notas'];
    const rows = sessions.map(s => [
      s.fecha,
      s.stake || '',
      s.tipo,
      s.cantManos || 0,
      s.minutos || 0,
      s.banca.toFixed(2),
      s.ganancia.toFixed(2),
      (s.deltaBanca || 0).toFixed(2),
      (s.deltaGanancia || 0).toFixed(2),
      s.fuente || '',
      `"${(s.notas || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `miPokerTracker_historial_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Table Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Historial de Sesiones y Movimientos
          </h2>
          <p className="text-xs text-slate-400">
            {filtered.length} registros encontrados de {sessions.length} totales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar fecha o nivel..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>

          {/* Filter Type */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'NL2', label: 'NL2 ($2)' },
              { id: 'NL5', label: 'NL5 ($5)' },
              { id: 'recompensa', label: 'Cofres' },
              { id: 'movimientos', label: 'Depósitos / Retiros' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setFilterType(f.id); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                  filterType === f.id ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Edit Latest Session Button */}
          {sessions && sessions.length > 0 && onEditSession && (
            <button
              onClick={() => onEditSession(sessions[sessions.length - 1])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
              title="Ajustar o corregir la última sesión"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar última sesión</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            title="Exportar a archivo Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Nivel</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4 text-right">Manos</th>
              <th className="py-3 px-4 text-right">Minutos</th>
              <th className="py-3 px-4 text-right">Resultado</th>
              <th className="py-3 px-4 text-right">Banca Total</th>
              <th className="py-3 px-4 text-right">Ganancia Acum.</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500 font-sans">
                  No se encontraron registros con los filtros actuales.
                </td>
              </tr>
            ) : (
              currentItems.map((item, idx) => {
                const isSesion = item.tipo === 'sesion';
                const isRecompensa = item.tipo === 'recompensa';
                const isDeposito = item.tipo === 'deposito';
                const isRetiro = item.tipo === 'retiro';

                const deltaColor =
                  isSesion
                    ? (item.deltaGanancia >= 0 ? 'text-green-400' : 'text-rose-400')
                    : isDeposito
                    ? 'text-blue-400'
                    : isRecompensa
                    ? 'text-amber-400'
                    : 'text-rose-400';

                const deltaText =
                  isSesion
                    ? `${item.deltaGanancia >= 0 ? '+' : ''}$${item.deltaGanancia.toFixed(2)}`
                    : `${item.deltaBanca >= 0 ? '+' : ''}$${item.deltaBanca.toFixed(2)}`;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      <div>{item.fecha}</div>
                      {item.notas && (
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-xs">{item.notas}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {item.stake ? (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${
                          item.stake === 'NL5'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                        }`}>
                          {item.stakeLabel || item.stake}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        isSesion ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        isRecompensa ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        isDeposito ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">
                      {isSesion ? item.cantManos.toLocaleString() : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">
                      {isSesion ? `${item.minutos}m` : '-'}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold ${deltaColor}`}>
                      {deltaText}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-400">
                      ${item.banca.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-semibold ${item.ganancia >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      ${item.ganancia.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEditSession && (
                          <button
                            onClick={() => onEditSession(item)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Editar sesión o ajustar saldo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteSession(item.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar este registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
          <div>
            Página <span className="font-semibold text-white">{page}</span> de <span className="font-semibold text-white">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
