import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/Loader';
import CookieConsentBanner, { getCookieConsent } from './components/CookieConsentBanner';
import GoogleAnalytics from './components/GoogleAnalytics';
import { useAuth } from './hooks/useAuth';

// Home stays a normal (eager) import — it's the landing page for most
// traffic, so there's nothing to gain from an extra network round-trip and
// loading-spinner flash on the single most common route. Everything else
// below used to be eager too, which meant every visitor downloaded the QR
// scanner (html5-qrcode) and the map library (leaflet, via Cafes'
// DiscoveryMap) up front regardless of whether they ever opened those pages —
// the same lazy-on-demand pattern already used for venue/admin routes below.
import Home from './pages/Home/Home';
const Cafes = lazy(() => import('./pages/Home/Cafes'));
const Social = lazy(() => import('./pages/Home/Social'));
const ScanQr = lazy(() => import('./pages/Home/ScanQr'));
const Pricing = lazy(() => import('./pages/Pricing/Pricing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VenueMenuPage = lazy(() => import('./pages/menu/VenueMenuPage'));
const PaymentCallback = lazy(() => import('./pages/menu/PaymentCallback'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));

const AccountLayout = lazy(() => import('./pages/customer/AccountLayout'));
const Wallet = lazy(() => import('./pages/customer/Wallet'));
const Subscription = lazy(() => import('./pages/customer/Subscription'));
const Referral = lazy(() => import('./pages/customer/Referral'));
const OrderHistory = lazy(() => import('./pages/customer/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/customer/OrderDetail'));
const Loyalty = lazy(() => import('./pages/customer/Loyalty'));
const Favorites = lazy(() => import('./pages/customer/Favorites'));
const Reviews = lazy(() => import('./pages/customer/Reviews'));
const Notifications = lazy(() => import('./pages/customer/Notifications'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const Sessions = lazy(() => import('./pages/customer/Sessions'));
const Support = lazy(() => import('./pages/customer/Support'));
const AccountDangerZone = lazy(() => import('./pages/customer/AccountDangerZone'));
const RegisterVenue = lazy(() => import('./pages/customer/RegisterVenue'));

// Venue and admin panels are lazy-loaded — an ordinary customer browsing the
// menu never downloads this code, only venue owners/staff and platform
// admins do, on demand when they actually open those routes.
const VenueLayout = lazy(() => import('./pages/venue/VenueLayout'));
const Dashboard = lazy(() => import('./pages/venue/Dashboard'));
const VenueOrders = lazy(() => import('./pages/venue/Orders'));
const MenuManagement = lazy(() => import('./pages/venue/MenuManagement'));
const ModifierGroups = lazy(() => import('./pages/venue/ModifierGroups'));
const PairingRules = lazy(() => import('./pages/venue/PairingRules'));
const Combos = lazy(() => import('./pages/venue/Combos'));
const Tables = lazy(() => import('./pages/venue/Tables'));
const Accounting = lazy(() => import('./pages/venue/Accounting'));
const Staff = lazy(() => import('./pages/venue/Staff'));
const Shifts = lazy(() => import('./pages/venue/Shifts'));
const Feedback = lazy(() => import('./pages/venue/Feedback'));
const Settings = lazy(() => import('./pages/venue/Settings'));
const Marketing = lazy(() => import('./pages/venue/Marketing'));
const Forecasting = lazy(() => import('./pages/venue/Forecasting'));
const Inventory = lazy(() => import('./pages/venue/Inventory'));
const Branches = lazy(() => import('./pages/venue/Branches'));
const Reservations = lazy(() => import('./pages/venue/Reservations'));
const Crm = lazy(() => import('./pages/venue/Crm'));
const KitchenDisplay = lazy(() => import('./pages/venue/KitchenDisplay'));
const TablePoster = lazy(() => import('./pages/venue/TablePoster'));
const ReceiptPrint = lazy(() => import('./pages/venue/ReceiptPrint'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminVenues = lazy(() => import('./pages/admin/Venues'));
const AdminVenueDetail = lazy(() => import('./pages/admin/VenueDetail'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'));
const AdminPlatformStaff = lazy(() => import('./pages/admin/PlatformStaff'));
const AdminBilling = lazy(() => import('./pages/admin/Billing'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminContentCenter = lazy(() => import('./pages/admin/ContentCenter'));
const AdminDbBackup = lazy(() => import('./pages/admin/DbBackup'));
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSecurity = lazy(() => import('./pages/admin/Security'));
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLog'));
const AdminGamification = lazy(() => import('./pages/admin/Gamification'));
const AdminBI = lazy(() => import('./pages/admin/BI'));
const AdminPlatformAccounting = lazy(() => import('./pages/admin/PlatformAccounting'));
const AdminFraudDetection = lazy(() => import('./pages/admin/FraudDetection'));
const AdminInternalTickets = lazy(() => import('./pages/admin/InternalTickets'));
const AdminSupport = lazy(() => import('./pages/admin/Support'));
const AdminPlanConfig = lazy(() => import('./pages/admin/PlanConfig'));
const AdminBroadcast = lazy(() => import('./pages/admin/Broadcast'));
const AdminSmsCampaigns = lazy(() => import('./pages/admin/SmsCampaigns'));
const AdminLiveOps = lazy(() => import('./pages/admin/LiveOps'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions'));

// The account landing page differs by role: customers land on their order
// history; owners/staff/admins don't have customer orders, so they land on
// the profile page instead.
function AccountIndex() {
  const { user } = useAuth();
  return user?.role === 'CUSTOMER' ? <OrderHistory /> : <Navigate to="/account/profile" replace />;
}

export default function App() {
  const [consent, setConsent] = useState(() => getCookieConsent());

  return (
    <Suspense fallback={<Loader text="در حال بارگذاری" />}>
    <GoogleAnalytics consent={consent} />
    <CookieConsentBanner onChange={setConsent} />
    <Routes>
      {/* Kitchen Display runs truly full-screen (kitchen tablet), outside the
          site chrome — no header, footer or layout transform to box it in. */}
      <Route
        path="/venue/kds"
        element={
          <ProtectedRoute roles={['VENUE_OWNER', 'VENUE_STAFF']}>
            <KitchenDisplay />
          </ProtectedRoute>
        }
      />

      {/* Print-ready table poster — outside site chrome so only the poster
          itself ends up on the printed/PDF page, no header or footer. */}
      <Route
        path="/venue/tables/:tableId/poster"
        element={
          <ProtectedRoute roles={['VENUE_OWNER', 'VENUE_STAFF']}>
            <TablePoster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/orders/:orderId/receipt-print"
        element={
          <ProtectedRoute roles={['VENUE_OWNER', 'VENUE_STAFF']}>
            <ReceiptPrint />
          </ProtectedRoute>
        }
      />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/cafes" element={<Cafes />} />
        <Route path="/social" element={<Social />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/menu/:venueId" element={<VenueMenuPage />} />
        <Route path="/payments/aqayepardakht/callback" element={<PaymentCallback />} />
        <Route path="/payments/zarinpal/callback" element={<PaymentCallback />} />
        <Route path="/payments/zibal/callback" element={<PaymentCallback />} />

        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AccountIndex />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="referral" element={<Referral />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="support" element={<Support />} />
          <Route path="danger-zone" element={<AccountDangerZone />} />
          <Route path="register-venue" element={<RegisterVenue />} />
        </Route>

        <Route
          path="/venue"
          element={
            <ProtectedRoute roles={['VENUE_OWNER', 'VENUE_STAFF']}>
              <VenueLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<VenueOrders />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="modifier-groups" element={<ModifierGroups />} />
          <Route path="pairing-rules" element={<PairingRules />} />
          <Route path="combos" element={<Combos />} />
          <Route path="tables" element={<Tables />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="staff" element={<Staff />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="settings" element={<Settings />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="forecasting" element={<Forecasting />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="branches" element={<Branches />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="crm" element={<Crm />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="venues" element={<AdminVenues />} />
          <Route path="venues/:venueId" element={<AdminVenueDetail />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:userId" element={<AdminCustomerDetail />} />
          <Route path="staff" element={<AdminPlatformStaff />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="content-center" element={<AdminContentCenter />} />
          <Route path="db-backup" element={<AdminDbBackup />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="gamification" element={<AdminGamification />} />
          <Route path="bi" element={<AdminBI />} />
          <Route path="platform-accounting" element={<AdminPlatformAccounting />} />
          <Route path="fraud" element={<AdminFraudDetection />} />
          <Route path="tickets" element={<AdminInternalTickets />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="plan-config" element={<AdminPlanConfig />} />
          <Route path="broadcast" element={<AdminBroadcast />} />
          <Route path="sms-campaigns" element={<AdminSmsCampaigns />} />
          <Route path="live-ops" element={<AdminLiveOps />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}
