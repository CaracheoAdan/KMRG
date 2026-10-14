import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, Lock } from 'lucide-react';
import axios from 'axios';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormInputs {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormInputs): Promise<void> => {
    setErrorMessage(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const serverMsg = error.response?.data?.message;
        setErrorMessage(
          typeof serverMsg === 'string'
            ? serverMsg
            : 'Error al iniciar sesión. Por favor verifica tus credenciales.'
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado al iniciar sesión.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8 sm:p-10 transition-all">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-4 shadow-sm">
            <Lock className="w-5 h-5 text-rose-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            KMRG
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Accede a tu centro de control
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm animate-in fade-in duration-200"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            id="login-email"
            label="Correo electrónico"
            type="email"
            placeholder="admin@kmrg.internal"
            autoComplete="email"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register('email', {
              required: 'El correo electrónico es obligatorio',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Ingresa un correo electrónico válido',
              },
            })}
          />

          <Input
            id="login-password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register('password', {
              required: 'La contraseña es obligatoria',
              minLength: {
                value: 8,
                message: 'La contraseña debe tener al menos 8 caracteres',
              },
            })}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            className="w-full mt-2 font-semibold shadow-sm"
          >
            Iniciar Sesión
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Acceso seguro administrativo &bull; KMRG System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
