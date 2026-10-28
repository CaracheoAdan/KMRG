import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Mail, Calendar, AlertCircle, RefreshCw, Heart, Sparkles, Clock, Check, X, Loader2 } from 'lucide-react';
import { getMessages, deleteMessage } from '../lib/messages.api';
import { formatCalendarDate, formatDateTime } from '../lib/utils';
import { getInteractions } from '../lib/interactions.api';
import { triggerEmergencyReset } from '../lib/admin.api';
import { Message, Interaction } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal de recuperación de emergencia para destrabar la app móvil
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'cita' | 'full'>('cita');
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleTriggerReset = async (): Promise<void> => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      const res = await triggerEmergencyReset(resetMode);
      setResetFeedback({
        success: true,
        message: res.message || 'Señal de desbloqueo enviada con éxito.',
      });
      fetchData();
    } catch (err: unknown) {
      console.error('Error al destrabar app:', err);
      setResetFeedback({
        success: false,
        message: 'No se pudo enviar la señal de recuperación. Intenta nuevamente.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [messagesResult, interactionsResult] = await Promise.allSettled([
        getMessages(),
        getInteractions(),
      ]);
      if (messagesResult.status === 'fulfilled' && Array.isArray(messagesResult.value)) {
        setMessages(messagesResult.value);
      }
      if (interactionsResult.status === 'fulfilled' && Array.isArray(interactionsResult.value)) {
        setInteractions(interactionsResult.value);
      }
      if (messagesResult.status === 'rejected' && interactionsResult.status === 'rejected') {
        throw messagesResult.reason;
      }
    } catch (error: unknown) {
      console.error('Error al cargar datos:', error);
      setErrorMessage('No se pudieron cargar los datos del Centro de Control. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Polling silencioso cada 15 segundos (pausado cuando la pestaña está oculta)
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const [freshInteractions, freshMessages] = await Promise.all([
          getInteractions(),
          getMessages(),
        ]);
        if (Array.isArray(freshInteractions)) {
          setInteractions(freshInteractions);
        }
        if (Array.isArray(freshMessages)) {
          setMessages(freshMessages);
        }
      } catch {
        // Silencioso
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este mensaje programado?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteMessage(id);
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    } catch (error: unknown) {
      console.error('Error al eliminar mensaje:', error);
      setErrorMessage('No se pudo eliminar el mensaje. Por favor intenta nuevamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatScheduledDate = formatCalendarDate;

  const truncateContent = (text: string, maxLen = 80): string => {
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  const getInteractionLabel = (type: string): string => {
    switch (type) {
      case 'thinking_of_you':
        return 'Pensando en ti ❤️';
      case 'heartbeat':
        return 'Latido de amor 💓';
      case 'reaction':
        return 'Reacción especial ✨';
      default:
        return 'Pensando en ti ❤️';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Sección de Interacciones: Pensando en ti */}
      <Card className="p-6 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/50 border-rose-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Pensando en ti
                <span className="bg-rose-100 text-rose-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                  {interactions.length} {interactions.length === 1 ? 'latido' : 'latidos'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Registros en vivo cuando ella presiona el corazón en la app
              </p>
            </div>
          </div>
          {interactions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-100/70 px-3 py-1.5 rounded-lg font-medium self-start sm:self-auto shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Último: {formatDateTime(interactions[0].created_at)}</span>
            </div>
          )}
        </div>

        {interactions.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-sm">
            Aún no hay interacciones registradas. Aparecerán aquí en cuanto presione el corazón.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
            {interactions.slice(0, 9).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-rose-100 shadow-2xs hover:border-rose-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {getInteractionLabel(item.type)}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDateTime(item.created_at)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mensajes Programados
          </h1>
          <Badge variant="neutral" className="font-semibold text-xs px-2.5 py-0.5">
            {isLoading ? '...' : messages.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRecoveryModalOpen(true);
              setResetFeedback(null);
            }}
            className="gap-1.5 text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 shadow-xs font-semibold px-3"
            title="Destrabar / Reparar app móvil remotamente si se quedó congelada"
          >
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Destrabar App</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
            title="Recargar lista"
            aria-label="Recargar lista de mensajes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard/new')}
            className="gap-2 shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Mensaje</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-red-700 hover:bg-red-100 text-xs px-2 py-1 h-auto"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Table Wrapper Card */}
      <Card padding="none" className="border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          /* Subtle Skeleton loading state */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cargando mensajes...
              </span>
            </div>
            <div className="divide-y divide-slate-100 animate-pulse">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 max-w-md" />
                  </div>
                  <div className="w-24 h-4 bg-slate-200 rounded shrink-0 hidden sm:block" />
                  <div className="w-16 h-5 bg-slate-200 rounded-full shrink-0" />
                  <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
              <Mail className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No hay mensajes programados
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Aún no tienes mensajes en la cola. Comienza redactando una carta o dedicatoria para una fecha especial.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-6 gap-2"
              onClick={() => navigate('/dashboard/new')}
            >
              <Plus className="w-4 h-4" />
              <span>Programar primer mensaje</span>
            </Button>
          </div>
        ) : (
          /* Messages Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6">
                    Mensaje
                  </th>
                  <th scope="col" className="py-3 px-4 w-40 whitespace-nowrap">
                    Fecha programada
                  </th>
                  <th scope="col" className="py-3 px-4 w-28 whitespace-nowrap text-center">
                    Estado
                  </th>
                  <th scope="col" className="py-3 px-4 sm:px-6 w-28 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {messages.map((message) => (
                  <tr
                    key={message.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Content & Color Indicator */}
                    <td className="py-4 px-4 sm:px-6 align-middle">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-slate-100 shadow-sm"
                            style={{
                              backgroundColor: message.theme_color || '#457b9d',
                            }}
                            title={`Color temático: ${message.theme_color}`}
                          />
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            De: <strong>{message.sender || 'Javier'}</strong> → Para: <strong>{message.recipient || 'Karlita'}</strong>
                          </span>
                        </div>
                        <span
                          className="text-slate-800 font-serif font-medium leading-relaxed pl-5"
                          title={message.content}
                        >
                          {truncateContent(message.content, 85)}
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        <span>{formatScheduledDate(message.scheduled_date)}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap text-center">
                      <Badge
                        variant={message.is_read ? 'success' : 'warning'}
                        dot
                      >
                        {message.is_read ? 'Leído' : 'Pendiente'}
                      </Badge>
                    </td>

                    {/* Edit & Delete Actions */}
                    <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/messages/${message.id}/edit`, {
                              state: { message },
                            })
                          }
                          className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 h-8 w-8 rounded-lg transition-colors"
                          title="Editar mensaje"
                          aria-label={`Editar mensaje del ${formatScheduledDate(message.scheduled_date)}`}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === message.id}
                          onClick={() => handleDelete(message.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 h-8 w-8 rounded-lg transition-colors"
                          title="Eliminar mensaje"
                          aria-label={`Eliminar mensaje del ${formatScheduledDate(message.scheduled_date)}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Recuperación y Desbloqueo Remoto */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" role="img" aria-label="salvavidas">🛟</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Destrabar App Móvil</h3>
                    <p className="text-xs text-slate-500">Recuperación y desbloqueo remoto</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Si la aplicación en el teléfono de Karlita o Javier se quedó trabada o congelada (por ejemplo al guardar una cita o por datos corruptos), puedes enviar una señal remota inmediata para destrabarla.
              </p>

              <div className="space-y-3 mb-5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resetMode === 'cita'
                      ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetMode"
                    value="cita"
                    checked={resetMode === 'cita'}
                    onChange={() => setResetMode('cita')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      Limpiar Cita Conflictiva (Recomendado)
                    </strong>
                    <span className="text-slate-500">
                      Elimina cualquier fecha u horario de cita que esté causando error en el teléfono. No borra fotos, recuerdos, notitas ni cartas.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resetMode === 'full'
                      ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetMode"
                    value="full"
                    checked={resetMode === 'full'}
                    onChange={() => setResetMode('full')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      Restablecer Pantalla Completa
                    </strong>
                    <span className="text-slate-500">
                      Restaura la pantalla de Hoy a valores limpios y seguros por defecto.
                    </span>
                  </div>
                </label>
              </div>

              {resetFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-4 ${
                    resetFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {resetFeedback.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{resetFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecoveryModalOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isResetting}
                  onClick={handleTriggerReset}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                >
                  {isResetting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{isResetting ? 'Enviando señal...' : 'Enviar Señal de Desbloqueo'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
