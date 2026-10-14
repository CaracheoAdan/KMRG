import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { createMessage } from '../lib/messages.api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';

interface NewMessageFormInputs {
  content: string;
  scheduled_date: string;
  theme_color: string;
}

const PRESET_COLORS = [
  { hex: '#e63946', label: 'Rojo' },
  { hex: '#457b9d', label: 'Azul' },
  { hex: '#2a9d8f', label: 'Verde' },
  { hex: '#f4a261', label: 'Naranja' },
  { hex: '#6d597a', label: 'Púrpura' },
  { hex: '#264653', label: 'Oscuro' },
];

export const NewMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewMessageFormInputs>({
    defaultValues: {
      content: '',
      scheduled_date: '',
      theme_color: PRESET_COLORS[0].hex,
    },
    mode: 'onTouched',
  });

  const selectedColor = watch('theme_color');

  const onSubmit = async (data: NewMessageFormInputs): Promise<void> => {
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
      {/* Back link & Header */}
      <div className="space-y-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a mensajes</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Escribir Nuevo Mensaje
        </h1>
        <p className="text-sm text-slate-500">
          Configura el texto, la fecha en que se desbloqueará y el color de presentación.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Form Card */}
      <Card padding="lg" className="border-slate-200/90 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Content Textarea */}
          <Textarea
            id="message-content"
            label="Tu mensaje"
            rows={6}
            placeholder="Escribe el contenido del mensaje o carta..."
            disabled={isSubmitting}
            error={errors.content?.message}
            {...register('content', {
              required: 'El contenido del mensaje es obligatorio',
              minLength: {
                value: 3,
                message: 'El mensaje debe tener al menos 3 caracteres',
              },
            })}
          />

          {/* Scheduled Date Input */}
          <Input
            id="scheduled-date"
            label="Fecha programada"
            type="date"
            disabled={isSubmitting}
            error={errors.scheduled_date?.message}
            {...register('scheduled_date', {
              required: 'La fecha programada es obligatoria',
            })}
          />

          {/* Theme Color Selector */}
          <div className="space-y-2.5">
            <label className="block text-sm font-medium text-slate-700 select-none">
              Color temático
            </label>
            <div className="flex items-center gap-3.5 flex-wrap pt-1">
              {PRESET_COLORS.map((color) => {
                const isSelected = selectedColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() =>
                      setValue('theme_color', color.hex, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-md'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={`${color.label} (${color.hex})`}
                    aria-label={`Seleccionar color ${color.label}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Hidden input to bind theme_color to form */}
            <input
              type="hidden"
              {...register('theme_color', { required: true })}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isSubmitting}
              onClick={() => navigate('/dashboard')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="font-medium shadow-sm px-6"
            >
              Programar Mensaje
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewMessagePage;
