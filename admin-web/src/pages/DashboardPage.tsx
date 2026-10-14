import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Mail, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { getMessages, deleteMessage } from '../lib/messages.api';
import { Message } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMessagesList = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMessages();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Error al cargar mensajes:', error);
      setErrorMessage('No se pudieron cargar los mensajes programados. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessagesList();
  }, [fetchMessagesList]);

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este mensaje programado?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteMessage(id);
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    } catch (error: unknown) {
      console.error('Error al eliminar mensaje:', error);
      alert('Error al eliminar el mensaje. Por favor intenta nuevamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatScheduledDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(Date.UTC(year, month, day));
        const monthNames = [
          'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
        ];
        return `${day} ${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      }
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const truncateContent = (text: string, maxLen = 80): string => {
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
            onClick={fetchMessagesList}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
            title="Recargar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
            onClick={fetchMessagesList}
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
                  <th scope="col" className="py-3 px-4 sm:px-6 w-20 text-right">
                    Acción
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
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-slate-100 shadow-sm"
                          style={{
                            backgroundColor: message.theme_color || '#457b9d',
                          }}
                          title={`Color temático: ${message.theme_color}`}
                        />
                        <span
                          className="text-slate-800 font-medium leading-relaxed"
                          title={message.content}
                        >
                          {truncateContent(message.content, 80)}
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
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

                    {/* Delete Action */}
                    <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === message.id}
                        onClick={() => handleDelete(message.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 h-8 w-8 rounded-lg transition-colors"
                        title="Eliminar mensaje"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
