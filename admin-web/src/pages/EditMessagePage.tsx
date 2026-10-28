import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getMessageById, getMessages, updateMessage } from '../lib/messages.api';
import { Message } from '../types';
import { MessageForm, MessageFormValues } from '../components/MessageForm';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface LocationState {
  message?: Message;
}

const normalizeDateInput = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

export const EditMessagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateMessage = (location.state as LocationState | null)?.message;

  const [message, setMessage] = useState<Message | null>(stateMessage ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!stateMessage);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoadError('Identificador de mensaje no válido.');
      setIsLoading(false);
      return;
    }

    if (stateMessage && stateMessage.id === id) {
      setMessage(stateMessage);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    // Intentar obtener directamente por ID con fallback a la lista
    getMessageById(id)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setMessage(data);
        } else {
          setLoadError('No se encontró el mensaje solicitado.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        return getMessages().then((list) => {
          if (cancelled) return;
          const found = list.find((item) => item.id === id);
          if (!found) {
            setLoadError('No se encontró el mensaje solicitado.');
          } else {
            setMessage(found);
          }
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Error al cargar mensaje:', error);
        setLoadError('No se pudo cargar la información del mensaje.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, stateMessage]);

  const handleSubmit = async (data: MessageFormValues): Promise<void> => {
    if (!id) return;
    setSubmitError(null);
    try {
      await updateMessage(id, {
        sender: data.sender,
        recipient: data.recipient,
        content: data.content.trim(),
        scheduled_date: data.scheduled_date,
        theme_color: data.theme_color,
        is_read: Boolean(data.is_read),
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Error al actualizar mensaje:', error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        setSubmitError(
          typeof msg === 'string'
            ? msg
            : 'Error al guardar los cambios del mensaje. Verifica los datos e intenta de nuevo.'
        );
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Ocurrió un error inesperado al actualizar el mensaje.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Volver a mensajes</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Editar Mensaje Programado
        </h1>
        <p className="text-sm text-slate-500">
          Modifica el texto, la fecha o el color de esta carta.
        </p>
      </div>

      {isLoading && (
        <Card padding="lg" className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" aria-hidden="true" />
            <p className="text-sm font-medium">Cargando información del mensaje...</p>
          </div>
        </Card>
      )}

      {loadError && !isLoading && (
        <Card padding="lg" className="border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium">{loadError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="border-red-300 text-red-700 hover:bg-red-100/60"
              >
                Volver al listado
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !loadError && message && (
        <MessageForm
          initialValues={{
            sender: message.sender || 'Javier',
            recipient: message.recipient || 'Karla',
            content: message.content,
            scheduled_date: normalizeDateInput(message.scheduled_date),
            theme_color: message.theme_color,
            is_read: message.is_read,
          }}
          showReadToggle={true}
          submitLabel="Guardar Cambios"
          errorMessage={submitError}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/dashboard')}
        />
      )}
    </div>
  );
};

export default EditMessagePage;
