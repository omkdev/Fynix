import { Link, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useAuth, AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import "./App.css";

function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <main className={`app ${isLanding ? "app--landing" : ""}`}>
      {!isLanding && (
        <header className="app-header">
          <h1>Fynix</h1>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            {user && (
              <>
                <span className="user-email">{user.email}</span>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={logout}
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
