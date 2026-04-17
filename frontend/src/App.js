import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import InventoryPage from "@/pages/InventoryPage";
import PurchasingPage from "@/pages/PurchasingPage";
import ManufacturingPage from "@/pages/ManufacturingPage";
import AccountingPage from "@/pages/AccountingPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import SetupWizardPage from "@/pages/SetupWizardPage";
import CustomOrdersPage from "@/pages/CustomOrdersPage";
import ReconciliationPage from "@/pages/ReconciliationPage";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) {
    if (user.role === "cashier") return <Navigate to="/pos" replace />;
    if (user.role === "production_staff") return <Navigate to="/manufacturing" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function SetupGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const API = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${API}/api/setup/status`);
        const data = await res.json();
        if (!data.setup_complete) {
          setNeedsSetup(true);
        }
      } catch {
        // If setup status fails, app might not be configured
        setNeedsSetup(true);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupWizardPage />} />
      <Route path="/login" element={<SetupGuard><PublicRoute><LoginPage /></PublicRoute></SetupGuard>} />
      <Route path="/dashboard" element={<SetupGuard><ProtectedRoute><DashboardPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/pos" element={<SetupGuard><ProtectedRoute roles={["admin", "cashier"]}><POSPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/products" element={<SetupGuard><ProtectedRoute roles={["admin", "cashier"]}><ProductsPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/inventory" element={<SetupGuard><ProtectedRoute roles={["admin", "production_staff"]}><InventoryPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/purchasing" element={<SetupGuard><ProtectedRoute roles={["admin"]}><PurchasingPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/manufacturing" element={<SetupGuard><ProtectedRoute roles={["admin", "production_staff"]}><ManufacturingPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/accounting" element={<SetupGuard><ProtectedRoute roles={["admin"]}><AccountingPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/reconciliation" element={<SetupGuard><ProtectedRoute roles={["admin", "cashier"]}><ReconciliationPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/custom-orders" element={<SetupGuard><ProtectedRoute roles={["admin", "cashier"]}><CustomOrdersPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/users" element={<SetupGuard><ProtectedRoute roles={["admin"]}><UsersPage /></ProtectedRoute></SetupGuard>} />
      <Route path="/settings" element={<SetupGuard><ProtectedRoute roles={["admin"]}><SettingsPage /></ProtectedRoute></SetupGuard>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
