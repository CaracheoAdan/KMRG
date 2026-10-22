import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Check, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';

export interface MessageFormValues {
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read?: boolean;
}

export const PRESET_COLORS = [
  { hex: '#e63946', label: 'Rojo' },
  { hex: '#457b9d', label: 'Azul' },
  { hex: '#2a9d8f', label: 'Verde' },
  { hex: '#f4a261', label: 'Naranja' },
  { hex: '#6d597a', label: 'Púrpura' },
  { hex: '#264653', label: 'Oscuro' },
];

export interface MessageFormProps {
  initialValues?: MessageFormValues;
  showReadToggle?: boolean;
  submitLabel: string;
  errorMessage?: string | null;
  onSubmit: (data: MessageFormValues) => Promise<void>;
  onCancel: () => void;
}

export const MessageForm: React.FC<MessageFormProps> = ({
  initialValues,
  showReadToggle = false,
  submitLabel,
  errorMessage,
  onSubmit,
  onCancel,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MessageFormValues>({
    defaultValues: {
      content: initialValues?.content ?? '',
      scheduled_date: initialValues?.scheduled_date ?? '',
      theme_color: initialValues?.theme_color || PRESET_COLORS[0].hex,
      is_read: initialValues?.is_read ?? false,
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        content: initialValues.content,
        scheduled_date: initialValues.scheduled_date,
        theme_color: initialValues.theme_color || PRESET_COLORS[0].hex,
        is_read: Boolean(initialValues.is_read),
      });
    }
  }, [initialValues, reset]);

  const selectedColor = watch('theme_color');
  const currentContent = watch('content') || '';

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <Card padding="lg" className="border-slate-200/90 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-1">
            <Textarea
              id="message-content"
              label="Tu mensaje"
              rows={6}
              maxLength={5000}
              placeholder="Escribe el contenido del mensaje o carta..."
              disabled={isSubmitting}
              error={errors.content?.message}
              className="font-serif text-base leading-relaxed"
              {...register('content', {
                required: 'El contenido del mensaje es obligatorio',
                minLength: {
                  value: 3,
                  message: 'El mensaje debe tener al menos 3 caracteres',
                },
                maxLength: {
                  value: 5000,
                  message: 'El mensaje no puede exceder los 5000 caracteres',
                },
              })}
            />
            <div className="flex justify-end">
              <span className="text-xs text-slate-400 font-medium">
                {currentContent.length} / 5000 caracteres
              </span>
            </div>
          </div>

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

          <div className="space-y-2.5">
            <label className="block text-sm font-medium text-slate-700 select-none">
              Color temático
            </label>
            <div className="flex items-center gap-3.5 flex-wrap pt-1">
              {PRESET_COLORS.map((color) => {
                const isSelected = selectedColor?.toLowerCase() === color.hex.toLowerCase();
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
                      <Check
                        className="w-4 h-4 text-white drop-shadow-sm"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}

              <label
                className="inline-flex items-center gap-2 ml-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 cursor-pointer hover:border-slate-300 transition-colors"
                title="Elegir color personalizado (#RRGGBB)"
              >
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(selectedColor || '') ? selectedColor : PRESET_COLORS[0].hex}
                  onChange={(e) =>
                    setValue('theme_color', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  disabled={isSubmitting}
                  aria-label="Selector de color personalizado"
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono uppercase">{selectedColor || PRESET_COLORS[0].hex}</span>
              </label>
            </div>
            <input
              type="hidden"
              {...register('theme_color', { required: true })}
            />
          </div>

          {currentContent.trim().length > 0 && (
            <div
              className="p-6 rounded-2xl border transition-colors"
              style={{
                backgroundColor: `${selectedColor || PRESET_COLORS[0].hex}12`,
                borderColor: `${selectedColor || PRESET_COLORS[0].hex}30`,
              }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-block mb-3"
                style={{
                  color: selectedColor || PRESET_COLORS[0].hex,
                  backgroundColor: `${selectedColor || PRESET_COLORS[0].hex}22`,
                }}
              >
                Vista previa en la app
              </span>
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center relative">
                <p className="font-serif text-lg leading-relaxed text-slate-800 whitespace-pre-wrap">
                  “{currentContent.trim()}”
                </p>
              </div>
            </div>
          )}

          {showReadToggle && (
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="message-is-read"
                type="checkbox"
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                {...register('is_read')}
              />
              <label
                htmlFor="message-is-read"
                className="text-sm font-medium text-slate-700 select-none cursor-pointer"
              >
                Marcar como leído
              </label>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isSubmitting}
              onClick={onCancel}
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
              {submitLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default MessageForm;
