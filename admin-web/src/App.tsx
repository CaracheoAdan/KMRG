import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold text-rose-400 mb-2">KMRG Admin Web</h1>
        <p className="text-slate-300 text-sm mb-6">
          Panel de administración para gestionar mensajes, hitos e interacciones.
        </p>
        <div className="rounded-lg bg-slate-950 p-4 border border-slate-800">
          <p className="text-xs text-slate-400">Estado de conexión con Backend:</p>
          <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Listo para configuración
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
