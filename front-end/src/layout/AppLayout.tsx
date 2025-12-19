import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, Navigate, useLocation } from "react-router";
import { useState } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import ChatWidget from "../components/dashboard/ChatWidget";
import Cookies from "js-cookie";

// ===================== ROLE GUARD =====================
const RoleGuard: React.FC = () => {
  const location = useLocation();
  const userData = Cookies.get("user");
  let user = null;
  try {
    user = userData ? JSON.parse(userData) : null;
  } catch (e) {
    console.error("Failed to parse user data from cookie", e);
  }
  const role = user?.role || "user";

  const path = location.pathname;

  // Allowed ONLY for non-admin users
  const allowedExact = ["/app/stock"]; // exact only
  const allowedPrefix = ["/app/stock/"]; // allow stock details like /app/stock/123

  const exactAllowed = allowedExact.includes(path);
  const prefixAllowed = allowedPrefix.some((prefix) =>
    path.startsWith(prefix)
  );

  if (role !== "Admin") {
    if (!exactAllowed && !prefixAllowed) {
      return <Navigate to="/app/stock" replace />;
    }
  }

  return <Outlet />;
};

// ===================== LAYOUT CONTENT =====================
const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>

      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader onChatToggle={() => setIsChatOpen(!isChatOpen)} />

        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
          {/* Protect all children inside layout */}
          <RoleGuard />
        </div>
      </div>

      <ChatWidget isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} />
    </div>
  );
};

// ===================== APP LAYOUT =====================
const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
