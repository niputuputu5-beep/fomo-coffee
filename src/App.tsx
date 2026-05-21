import { Navigate, Routes, Route } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PublicInfoPage = lazy(() => import("./pages/PublicInfoPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PosPage = lazy(() => import("./pages/PosPage"));
const KitchenPage = lazy(() => import("./pages/KitchenPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const PromosPage = lazy(() => import("./pages/PromosPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const ShiftsPage = lazy(() => import("./pages/ShiftsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

type Role = "owner" | "admin" | "cashier";

function ProtectedLayout({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-[#241C17]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PageLoader() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center text-white/70">
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/contact" element={<PublicInfoPage type="contact" />} />
      <Route path="/support" element={<PublicInfoPage type="support" />} />
      <Route path="/fax" element={<PublicInfoPage type="fax" />} />
      <Route path="/privacy" element={<PublicInfoPage type="privacy" />} />
      <Route path="/terms" element={<PublicInfoPage type="terms" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <DashboardPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <PosPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <KitchenPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <ProductsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <CategoriesPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <InventoryPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <SuppliersPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <CustomersPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/membership"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <ModulePage kind="membership" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/promos"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <PromosPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <TransactionsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/shifts"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <ShiftsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <ModulePage kind="purchase-order" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/receiving"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <ModulePage kind="receiving" />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout roles={["owner", "admin"]}>
            <ReportsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedLayout roles={["owner"]}>
            <UsersPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <NotificationsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedLayout roles={["owner"]}>
            <AuditLogPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout roles={["owner"]}>
            <SettingsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedLayout roles={["owner", "admin", "cashier"]}>
            <ProfilePage />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
