import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
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
import SetupPage from "@/pages/SetupPage";
import CustomOrdersPage from "@/pages/CustomOrdersPage";

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute roles={["admin", "cashier"]}><POSPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute roles={["admin", "cashier"]}><ProductsPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={["admin", "production_staff"]}><InventoryPage /></ProtectedRoute>} />
      <Route path="/purchasing" element={<ProtectedRoute roles={["admin"]}><PurchasingPage /></ProtectedRoute>} />
      <Route path="/manufacturing" element={<ProtectedRoute roles={["admin", "production_staff"]}><ManufacturingPage /></ProtectedRoute>} />
      <Route path="/accounting" element={<ProtectedRoute roles={["admin"]}><AccountingPage /></ProtectedRoute>} />
      <Route path="/custom-orders" element={<ProtectedRoute roles={["admin", "cashier"]}><CustomOrdersPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={["admin"]}><UsersPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={["admin"]}><SettingsPage /></ProtectedRoute>} />
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
