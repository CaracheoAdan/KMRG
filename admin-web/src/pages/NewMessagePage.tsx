import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { createMessage } from '../lib/messages.api';
import { MessageForm, MessageFormValues } from '../components/MessageForm';

export const NewMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (data: MessageFormValues): Promise<void> => {
    setErrorMessage(null);
    try {
      await createMessage({
        content: data.content.trim(),
        scheduled_date: data.scheduled_date,
        theme_color: data.theme_color,
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Error al programar mensaje:', error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        setErrorMessage(
          typeof msg === 'string'
            ? msg
            : 'Error al programar el mensaje en el servidor. Verifica los datos e intenta de nuevo.'
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado al programar el mensaje.');
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
          Escribir Nuevo Mensaje
        </h1>
        <p className="text-sm text-slate-500">
          Configura el texto, la fecha en que se desbloqueará y el color de presentación.
        </p>
      </div>

      <MessageForm
        submitLabel="Programar Mensaje"
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/dashboard')}
      />
    </div>
  );
};

export default NewMessagePage;
