import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import axios from 'axios';
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '../lib/milestones.api';
import type { Milestone } from '../types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from '../components/ui';

interface MilestoneFormValues {
  title: string;
  date: string;
  image_url: string;
}

const normalizeDateInput = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    const cleanDate = normalizeDateInput(dateStr);
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

export const MilestonesPage: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MilestoneFormValues>({
    defaultValues: {
      title: '',
      date: '',
      image_url: '',
    },
    mode: 'onTouched',
  });

  const watchedImageUrl = watch('image_url');

  const fetchMilestones = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMilestones();
      if (Array.isArray(data)) {
        setMilestones(data);
      }
    } catch (error: unknown) {
      console.error('Error al cargar recuerdos:', error);
      setErrorMessage('No se pudieron cargar los recuerdos. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const openCreateForm = (): void => {
    setEditingMilestone(null);
    setFormError(null);
    reset({
      title: '',
      date: '',
      image_url: '',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (milestone: Milestone): void => {
    setEditingMilestone(milestone);
    setFormError(null);
    reset({
      title: milestone.title,
      date: normalizeDateInput(milestone.date),
      image_url: milestone.image_url,
    });
    setIsFormOpen(true);
  };

  const closeForm = (): void => {
    setIsFormOpen(false);
    setEditingMilestone(null);
    setFormError(null);
    reset({
      title: '',
      date: '',
      image_url: '',
    });
  };

  const onSubmit = async (values: MilestoneFormValues): Promise<void> => {
    setFormError(null);
    const payload = {
      title: values.title.trim(),
      date: values.date,
      image_url: values.image_url.trim(),
    };

    try {
      const sortByDateAsc = (list: Milestone[]): Milestone[] =>
        [...list].sort((a, b) =>
          normalizeDateInput(a.date).localeCompare(normalizeDateInput(b.date))
        );

      if (editingMilestone) {
        const updated = await updateMilestone(editingMilestone.id, payload);
        setMilestones((prev) =>
          sortByDateAsc(
            prev.map((item) => (item.id === editingMilestone.id ? updated : item))
          )
        );
      } else {
        const created = await createMilestone(payload);
        setMilestones((prev) => sortByDateAsc([...prev, created]));
      }
      closeForm();
    } catch (error: unknown) {
      console.error('Error al guardar recuerdo:', error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        setFormError(
          typeof msg === 'string'
            ? msg
            : 'No se pudo guardar el recuerdo. Verifica los datos e intenta nuevamente.'
        );
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Ocurrió un error inesperado al guardar el recuerdo.');
      }
    }
  };

  const handleDelete = async (milestone: Milestone): Promise<void> => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar el recuerdo "${milestone.title}"?`
    );
    if (!confirmed) return;

    setDeletingId(milestone.id);
    try {
      await deleteMilestone(milestone.id);
      setMilestones((prev) => prev.filter((item) => item.id !== milestone.id));
      if (editingMilestone?.id === milestone.id) {
        closeForm();
      }
    } catch (error: unknown) {
      console.error('Error al eliminar recuerdo:', error);
      alert('Error al eliminar el recuerdo. Por favor intenta nuevamente.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recuerdos Especiales
          </h1>
          <Badge variant="neutral" className="font-semibold text-xs px-2.5 py-0.5">
            {isLoading ? '...' : milestones.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMilestones}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
            title="Recargar recuerdos"
            aria-label="Recargar lista de recuerdos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>

          {!isFormOpen && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateForm}
              className="gap-2 shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nuevo Recuerdo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Form Card (Create / Edit) */}
      {isFormOpen && (
        <Card padding="md" className="border-slate-200/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-slate-100">
            <div>
              <CardTitle>
                {editingMilestone ? 'Editar Recuerdo' : 'Nuevo Recuerdo'}
              </CardTitle>
              <CardDescription className="mt-1">
                {editingMilestone
                  ? 'Actualiza el título, la fecha o la fotografía de este recuerdo.'
                  : 'Agrega un momento importante con su fecha y fotografía.'}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeForm}
              className="p-2 h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
              title="Cerrar formulario"
              aria-label="Cerrar formulario"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </CardHeader>

          <CardContent className="pt-5">
            {formError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="milestone-title"
                  label="Título del recuerdo"
                  placeholder="Ej. Nuestro primer viaje juntos"
                  disabled={isSubmitting}
                  error={errors.title?.message}
                  {...register('title', {
                    required: 'El título es obligatorio',
                    minLength: {
                      value: 2,
                      message: 'El título debe tener al menos 2 caracteres',
                    },
                  })}
                />

                <Input
                  id="milestone-date"
                  label="Fecha"
                  type="date"
                  disabled={isSubmitting}
                  error={errors.date?.message}
                  {...register('date', {
                    required: 'La fecha es obligatoria',
                  })}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <Input
                    id="milestone-image-url"
                    label="URL de la imagen"
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    disabled={isSubmitting}
                    error={errors.image_url?.message}
                    {...register('image_url', {
                      required: 'La URL de la imagen es obligatoria',
                      pattern: {
                        value: /^https?:\/\/.+/i,
                        message: 'Ingresa una URL válida que comience con http:// o https://',
                      },
                    })}
                  />
                </div>

                {watchedImageUrl && /^https?:\/\/.+/i.test(watchedImageUrl) && (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 sm:mt-6 flex items-center justify-center">
                    <img
                      src={watchedImageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={closeForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  className="font-medium shadow-sm px-5"
                >
                  {editingMilestone ? 'Guardar Cambios' : 'Crear Recuerdo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMilestones}
            className="text-red-700 hover:bg-red-100 text-xs px-2 py-1 h-auto"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Milestones List Card */}
      <Card padding="none" className="border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cargando recuerdos...
              </span>
            </div>
            <div className="divide-y divide-slate-100 animate-pulse">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                    <div className="h-4 bg-slate-200 rounded w-1/2 max-w-xs" />
                  </div>
                  <div className="w-24 h-4 bg-slate-200 rounded shrink-0 hidden sm:block" />
                  <div className="w-16 h-8 bg-slate-100 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : milestones.length === 0 ? (
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
              <ImageIcon className="w-7 h-7 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No hay recuerdos registrados
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Agrega vuestros momentos especiales con su fecha y fotografía para la línea de tiempo.
            </p>
            {!isFormOpen && (
              <Button
                size="sm"
                variant="primary"
                className="mt-6 gap-2"
                onClick={openCreateForm}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Agregar primer recuerdo</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6">
                    Recuerdo
                  </th>
                  <th scope="col" className="py-3 px-4 w-44 whitespace-nowrap">
                    Fecha
                  </th>
                  <th scope="col" className="py-3 px-4 sm:px-6 w-28 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {milestones.map((milestone) => {
                  const isBroken = Boolean(brokenImages[milestone.id]);
                  return (
                    <tr
                      key={milestone.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {!isBroken && milestone.image_url ? (
                              <img
                                src={milestone.image_url}
                                alt={milestone.title}
                                className="w-full h-full object-cover"
                                onError={() =>
                                  setBrokenImages((prev) => ({
                                    ...prev,
                                    [milestone.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <ImageIcon
                                className="w-5 h-5 text-slate-400"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-serif font-semibold text-slate-900 truncate">
                              {milestone.title}
                            </p>
                            {/^https?:\/\//i.test(milestone.image_url) && (
                              <a
                                href={milestone.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-400 hover:text-rose-500 truncate block max-w-xs sm:max-w-md transition-colors"
                              >
                                {milestone.image_url}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{formatDisplayDate(milestone.date)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(milestone)}
                            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 h-8 w-8 rounded-lg transition-colors"
                            title="Editar recuerdo"
                            aria-label={`Editar recuerdo ${milestone.title}`}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === milestone.id}
                            onClick={() => handleDelete(milestone)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 h-8 w-8 rounded-lg transition-colors"
                            title="Eliminar recuerdo"
                            aria-label={`Eliminar recuerdo ${milestone.title}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MilestonesPage;
