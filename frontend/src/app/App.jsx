import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import { PublicRoutes } from '../routes/PublicRoutes.jsx';
import { useStoreSettings } from '../features/store/index.js';
import { LoadingState } from '../shared/components/LoadingState.jsx';
import { ErrorState } from '../shared/components/ErrorState.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { QueryProvider } from './providers/QueryProvider.jsx';

/**
 * Panel administrativo, cargado bajo demanda.
 *
 * 06_FRONTEND.md §1.0.0 reserva `Suspense` **solo para code splitting**, y este
 * es el corte que más pesa: el panel es para unos pocos administradores, y
 * empaquetado junto al catálogo lo descargaba también cada visitante que sólo
 * viene a mirar productos.
 */
const AdminRoutes = lazy(() =>
  import('../routes/AdminRoutes.jsx').then((modulo) => ({ default: modulo.AdminRoutes })),
);

/**
 * Raíz de la aplicación.
 *
 * Fase 6: al enrutamiento público se suma el panel administrativo, que cuelga
 * de `/admin` y **no depende de la configuración de la tienda**: esos datos son
 * del catálogo público y bloquear el panel con ellos dejaría al administrador
 * fuera si la tienda todavía no está configurada.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/admin/*"
              element={
                <Suspense fallback={<LoadingState message="Cargando panel…" />}>
                  <AdminRoutes />
                </Suspense>
              }
            />
            <Route path="*" element={<PublicApp />} />
          </Routes>
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  );
}

function PublicApp() {
  const { data: storeSettings, isLoading, isError, refetch } = useStoreSettings();

  if (isLoading) return <LoadingState message="Cargando tienda…" />;
  if (isError) return <ErrorState title="No pudimos cargar la tienda" onRetry={refetch} />;

  return <PublicRoutes storeSettings={storeSettings ?? null} />;
}
