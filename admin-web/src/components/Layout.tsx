import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { MessageSquare, PenLine, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar fijo a la izquierda */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 h-screen bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 z-30 select-none">
        {/* Encabezado del Sidebar */}
        <div>
          <div className="px-6 py-6 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>KMRG</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
              Centro de Control
            </p>
          </div>

          {/* Navegación Principal */}
          <nav className="mt-6 px-3 space-y-1">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  isActive
                    ? 'bg-slate-800 text-white border-rose-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MessageSquare
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>Mensajes</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/dashboard/new"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg border-l-4 ${
                  isActive
                    ? 'bg-slate-800 text-white border-rose-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <PenLine
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>Nuevo Mensaje</span>
                </>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Pie del Sidebar - Usuario y Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <div className="mb-3 px-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Administrador
            </span>
            <p
              className="text-sm text-slate-200 truncate font-medium mt-0.5"
              title={user?.email || 'admin@kmrg.internal'}
            >
              {user?.email || 'admin@kmrg.internal'}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Área de contenido principal */}
      <main className="ml-64 flex-1 min-h-screen bg-slate-50 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
