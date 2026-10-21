import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanUrl = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const fail = (message: string) => {
      cleanUrl();
      if (!cancelled) setError(message);
    };

    const completeLogin = async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const oauthError =
        query.get('error_description') ||
        hash.get('error_description') ||
        query.get('error') ||
        hash.get('error');

      if (oauthError) {
        fail('No se pudo completar el inicio de sesión. Inténtalo de nuevo.');
        return;
      }

      // Implicit-flow tokens are forbidden; only the PKCE code is accepted.
      const hasImplicitTokens =
        query.has('access_token') ||
        query.has('refresh_token') ||
        hash.has('access_token') ||
        hash.has('refresh_token');

      if (hasImplicitTokens) {
        fail('Método de autenticación no permitido. Inicia sesión nuevamente.');
        return;
      }

      const code = query.get('code');

      // Never leave the authorization code (or tokens) in browser history.
      cleanUrl();

      if (code) {
        // Supabase may have already consumed the code via detectSessionInUrl;
        // the session check below handles both cases.
        await supabase.auth.exchangeCodeForSession(code);
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !session) {
        setError('No se pudo establecer la sesión');
        return;
      }

      navigate('/', { replace: true });
    };

    completeLogin().catch(() => {
      if (!cancelled) setError('No se pudo completar el inicio de sesión');
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">Error: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Iniciando sesión...</p>
      </div>
    </div>
  );
}
