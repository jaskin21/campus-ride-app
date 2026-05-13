import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// ─── Lazy pages ───────────────────────────────────────
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const StudentHomePage = lazy(() => import("../pages/student/StudentHomePage"));
const AdminDashboardPage = lazy(
  () => import("../pages/admin/AdminDashboardPage"),
);
const DriverPanelPage = lazy(() => import("../pages/driver/DriverPanelPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const StudentQueuePage = lazy(
  () => import("../pages/student/StudentQueuePage"),
);
const StudentProfilePage = lazy(
  () => import("../pages/student/StudentProfilePage"),
);
const AdminStudentsPage = lazy(
  () => import("../pages/admin/AdminStudentsPage"),
);
const AdminStopsPage = lazy(() => import("../pages/admin/AdminStopsPage"));
const AdminSettingsPage = lazy(
  () => import("../pages/admin/AdminSettingsPage"),
);
const DriverBoardingPage = lazy(
  () => import("../pages/driver/DriverBoardingPage"),
);
const DriverProfilePage = lazy(
  () => import("../pages/driver/DriverProfilePage"),
);

// ─── Loading spinner ──────────────────────────────────
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
  </div>
);

// ─── Redirect based on role ───────────────────────────
const RedirectByRole = () => {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "driver") return <Navigate to="/driver/panel" replace />;
  return <Navigate to="/student/home" replace />;
};

// ─── Protected route ──────────────────────────────────
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role ?? ""))
    return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ─── Router ───────────────────────────────────────────
export default function AppRouter() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={user ? <RedirectByRole /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={user ? <RedirectByRole /> : <RegisterPage />}
          />

          {/* Student */}
          <Route
            path="/student/home"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/queue"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stops"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStopsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Driver routes */}
          <Route
            path="/driver/boarding"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverBoardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/profile"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/panel"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverPanelPage />
              </ProtectedRoute>
            }
          />

          {/* Index */}
          <Route path="/" element={<RedirectByRole />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
