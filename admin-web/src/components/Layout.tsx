import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageSquare, PenLine, Image, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Cerrar el drawer móvil automáticamente al cambiar de ruta o presionar Escape
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Barra superior móvil (<md) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white border-b border-slate-800 px-4 flex items-center justify-between z-20 md:hidden">
        <div className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <span>KMRG</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={isMobileMenuOpen}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>

      {/* Overlay oscuro para el drawer móvil (<md) */}
      {isMobileMenuOpen && (
        <div
          role="presentation"
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar fijo en md+, drawer deslizable en <md */}
      <aside
        aria-label="Menú lateral de administración"
        className={`fixed left-0 top-0 bottom-0 w-64 h-screen bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 z-40 select-none transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Encabezado del Sidebar */}
        <div>
          <div className="px-6 py-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>KMRG</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
                Centro de Control
              </p>
            </div>
            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Cerrar menú de navegación"
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navegación Principal */}
          <nav aria-label="Navegación principal" className="mt-6 px-3 space-y-1">
            <NavLink
              to="/dashboard"
              end
              onClick={closeMobileMenu}
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
                    aria-hidden="true"
                  />
                  <span>Mensajes</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/dashboard/new"
              onClick={closeMobileMenu}
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
                    aria-hidden="true"
                  />
                  <span>Nuevo Mensaje</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/milestones"
              onClick={closeMobileMenu}
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
                  <Image
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Recuerdos</span>
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
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Área de contenido principal */}
      <main className="md:ml-64 flex-1 min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 pt-20 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
