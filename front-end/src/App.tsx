import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import Forgot from "./pages/AuthPages/forgot";

import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import Home from "./pages/Dashboard/Home";
import Category from "./pages/Category";
import SubCategory from "./pages/SubCategory";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Settings from "./pages/settings";
import Suppliers from "./pages/Supplier";
import StockPage from "./pages/Stock";
import StockTracker from "./pages/StockTracker";
import Users from "./pages/user";
import UserProfile from "./pages/UserProfiles";

import PrivateRoute from "./components/auth/PrivateRoute";
import StockHistory from "./pages/StockHistory";
import StockSummary from "./pages/StockSummary";
import NotificationsPage from "./pages/Notifications";

export default function App() {
  return (
    <Router basename="/fashionhouse">
      <ScrollToTop />

      <Routes>
        {/* Redirect root → /signin */}
        <Route path="/" element={<Navigate to="/signin" replace />} />

        {/* Public auth pages */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<Forgot />} />

        {/* Protected dashboard pages */}
        <Route
          path="/app/*"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
            
          }
        >
          {/* Default dashboard landing */}
          <Route index element={<Home />} />

          {/* Your pages */}
          <Route path="category" element={<Category />} />
          <Route path="categories" element={<SubCategory />} />
          <Route path="products" element={<Products />} />
          <Route path="report" element={<StockSummary />} />
          {/* <Route path="report" element={<Reports />} /> */}

           <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="stock" element={<StockTracker />} />
          <Route path="stock-management" element={<StockPage />} />
          <Route path=":id/history" element={<StockHistory />} />
          <Route path="users" element={<Users />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
