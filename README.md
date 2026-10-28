# ♠ miPokerTracker v2.0

> **Dashboard moderno de seguimiento de banca y estadísticas para PokerStars, con gráficas interactivas y análisis en tiempo real.**

![Versión](https://img.shields.io/badge/version-2.0.0-emerald)
![Node](https://img.shields.io/badge/node->=20-blue)
![React](https://img.shields.io/badge/react-18-cyan)
![TailwindCSS](https://img.shields.io/badge/tailwind-3.4-teal)
![PokerStars](https://img.shields.io/badge/pokerstars-compatible-red)

---

## 🌟 ¿Qué es miPokerTracker?

**miPokerTracker** es una aplicación personal diseñada para jugadores de póker que desean llevar un control riguroso de su gestión de banca (*bankroll management*), evolución de ganancias y rendimiento en las mesas de **PokerStars**.

### 🔄 La Evolución: de la v1 a la v2

- **Versión 1.0 (Legacy)**: Desarrollada originalmente en **C** (Code::Blocks / MinGW), utilizaba un archivo binario (`saldo.dat`) de 32 bytes por struct y generaba scripts para Gnuplot por consola. El código histórico original se encuentra preservado y documentado en la carpeta [`/v1-c`](./v1-c).
- **Versión 2.0 (Actual)**: Reescritura completa a una aplicación moderna con **Node.js, React 18, Tailwind CSS y Recharts**, que permite:
  1. **Visualización interactiva** del saldo total, beneficios en mesas y volumen de manos.
  2. **Carga directa de historiales de PokerStars** mediante un parser de *Hand History* (.txt) que calcula automáticamente ganancias, manos, duración, VPIP y PFR.
  3. **Migración 100% transparente**: Conserva todo el historial acumulado en el `saldo.dat` previo sin perder ni un centavo ni una mano.

---

## 🚀 Características Principales

### 1. 📊 Dashboard Financiero y Tarjetas KPI
- **Banca Actual**: Saldo acumulado en cuenta en tiempo real.
- **Ganancia en Mesas**: Beneficio neto obtenido exclusivamente en las mesas de juego.
- **Recompensas / Cofres**: Registro diferenciado de *Stars Rewards*, rakeback y bonos (no sesgan el winrate de juego).
- **Volumen y Horas**: Manos totales jugadas y tiempo acumulado en las mesas.
- **Rendimiento Horario**: Cálculo automático de ganancias por hora (`$/h`) y estimación de winrate.

### 2. 📈 Gráfica de Rendimiento Interactiva
- Alterna al instante entre **Banca Total**, **Ganancia en Juego** y **Volumen de Manos**.
- Filtros rápidos por periodo: **7 Días**, **30 Días**, **90 Días** o **Todo el Historial**.
- Tooltips detallados al pasar el cursor con desglose de fecha, manos y resultado de cada sesión.

### 3. 🎯 Integración Directa con PokerStars
- Detecta automáticamente la ruta de PokerStars en Windows:
  `C:\Users\<Usuario>\AppData\Local\PokerStars\HandHistory\`
- **Parser inteligente**:
  - Extrae apuestas, ciegas, calls, subidas y premios devueltos.
  - Detecta automáticamente al jugador Hero (`Dealt to <Hero> [Cards]`).
  - Calcula estadísticas de juego: **VPIP %**, **PFR %**, **Went to Showdown %** y **Won at Showdown %**.
- Pestaña de pruebas para copiar y pegar texto de manos individuales o lotes de torneos/cash.

### 4. 📋 Tabla Histórica y Exportación
- Vista paginada de todas las sesiones registradas.
- Buscador por fecha o modalidad y filtros por tipo (Sesión, Cofre, Retiro).
- Botón de **Exportar a CSV / Excel** con un solo clic.

---

## 🛠️ Instalación y Uso Rápido en Windows

### Opción Rápida (1 Clic)
Simplemente haz doble clic sobre el archivo **`iniciar.bat`** en la carpeta principal.  
Este script levantará el servidor local y abrirá automáticamente tu navegador en `http://localhost:3001`.

### Modo Desarrollo
Si deseas modificar el código o correr la aplicación en vivo con recarga rápida (HMR):

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor backend
npm run server

# 3. En otra terminal, iniciar frontend con Vite
npm run dev
```

---

## 📁 Estructura del Proyecto

```
miPokerTracker/
├── v1-c/                     # Versión 1 original en C (main.c, cbp, gnuplot)
├── data/
│   ├── sessions.json         # Base de datos local (privada, excluida por git)
│   ├── demo-sessions.json    # Datos de demostración públicos
│   └── backups/              # Copia de seguridad del saldo.dat original
├── server/
│   ├── index.js              # Servidor API Express y servidor de estáticos
│   ├── pokerstars-parser.js  # Motor de parsing de manos de PokerStars (.txt)
│   └── dat-migrator.js       # Script de migración binaria C -> JSON
├── src/                      # Frontend en React + Tailwind + Recharts
│   ├── components/
│   │   ├── KPICards.jsx
│   │   ├── EvolutionChart.jsx
│   │   ├── SessionTable.jsx
│   │   ├── AddSessionModal.jsx
│   │   ├── AddRewardModal.jsx
│   │   └── PokerStarsSyncModal.jsx
│   ├── App.jsx
│   └── main.jsx
├── iniciar.bat               # Acceso directo para Windows
├── package.json
└── README.md
```

---

## 🔒 Privacidad y Seguridad de Datos

Tus historiales de manos privados y tu archivo `data/sessions.json` están listados en el `.gitignore`. Al clonar el repositorio en una máquina nueva, el sistema utilizará `data/demo-sessions.json` de prueba hasta que agregues o sincronices tus propias sesiones.

---

## 📜 Licencia

Desarrollado por **Alan** bajo licencia MIT.
