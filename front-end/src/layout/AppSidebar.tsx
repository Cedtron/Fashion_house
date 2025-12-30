import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import {
  IoGrid,
  IoGridOutline,
  IoAlbums,
  IoAlbumsOutline,
  IoDocumentText,
  IoDocumentTextOutline,
  IoPieChart,
  IoPieChartOutline,
  IoSettings,
  IoSettingsOutline,
  IoChevronDown,
  IoEllipsisHorizontal,
} from "react-icons/io5";

import logoFull from '/images/logo/logo.png';
import logoSmall from '/images/logo/logos.png';
import { PiCashRegisterLight,PiCashRegisterFill  } from "react-icons/pi";
import { BsBasket2Fill, BsBasket2 } from "react-icons/bs";
import { useSidebar } from "../context/SidebarContext";

// ================= NAV INTERFACE =================
interface NavItem {
  iconFilled: React.ReactElement;
  iconOutline: React.ReactElement;
  name: string;
  path?: string;
  subItems?: { name: string; path: string }[];
}

// ================= NAV ITEMS =================
const navItems: NavItem[] = [
  { iconFilled: <IoGrid />, iconOutline: <IoGridOutline />, name: "Dashboard", path: "/app" },
  { iconFilled: <PiCashRegisterFill/>, iconOutline: <PiCashRegisterLight />, name: "Stock", path: "/app/stock" },
  { iconFilled: <BsBasket2Fill />, iconOutline: <BsBasket2 />, name: "Stock Management", path: "/app/stock-management" },
  { iconFilled: <IoAlbums />, iconOutline: <IoAlbumsOutline />, name: "Categories", path: "/app/categories" },
  { iconFilled: <IoDocumentText />, iconOutline: <IoDocumentTextOutline />, name: "Suppliers", path: "/app/suppliers" },
  { iconFilled: <IoPieChart />, iconOutline: <IoPieChartOutline />, name: "Reports", path: "/app/report" },
  {
    iconFilled: <IoSettings />,
    iconOutline: <IoSettingsOutline />,
    name: "Settings",
    subItems: [
      { name: "User", path: "/app/users" },
      { name: "User Profile", path: "/app/profile" },
    ],
  },
];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  // ================= GET USER ROLE =================
  const cookieData = Cookies.get("user");
  const user = cookieData ? JSON.parse(cookieData) : null;
  const role = user?.role || "user";

  // Filter nav items based on role
  const visibleNavItems = role === "Admin"
    ? navItems
    : navItems.filter((item) => item.name === "Stock");

  const [openSubmenu, setOpenSubmenu] = useState<{ type: string; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Update submenu heights when they open
    Object.entries(subMenuRefs.current).forEach(([key, el]) => {
      if (el && openSubmenu) {
        const isOpen = openSubmenu.type === key.split('-')[0] && openSubmenu.index === parseInt(key.split('-')[1]);
        if (isOpen) {
          setSubMenuHeight(prev => ({
            ...prev,
            [key]: el.scrollHeight
          }));
        }
      }
    });
  }, [openSubmenu]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Auto open submenu for admin only
  useEffect(() => {
    if (role !== "Admin") return; // non-admin has no submenu

    let submenuMatched = false;

    const checkMenu = (items: NavItem[], type: string) => {
      items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach((sub) => {
            if (isActive(sub.path)) {
              setOpenSubmenu({ type, index: i });
              submenuMatched = true;
            }
          });
        }
      });
    };

    checkMenu(visibleNavItems, "main");
    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive, role, visibleNavItems]);

  const handleSubmenuToggle = (index: number, type: string) => {
    if (role !== "Admin") return; // saler cannot open submenu

    setOpenSubmenu((prev) =>
      prev && prev.type === type && prev.index === index ? null : { type, index }
    );
  };

  // ================= RENDER FUNCTION =================
  const renderMenuItems = (items: NavItem[], type: string) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => {
        const key = `${type}-${index}`;
        const opened = openSubmenu?.type === type && openSubmenu?.index === index;

        return (
          <li key={nav.name}>
            {/* SUBMENU BUTTON (Admin Only) */}
            {nav.subItems && role === "Admin" ? (
              <button
                onClick={() => handleSubmenuToggle(index, type)}
                className={`menu-item ${opened ? "menu-item-active" : "menu-item-inactive"}`}
              >
                <span className="menu-item-icon-size">
                  {opened ? nav.iconFilled : nav.iconOutline}
                </span>

                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}

                {(isExpanded || isHovered || isMobileOpen) && (
                  <IoChevronDown className={`ml-auto transition-transform ${opened ? "rotate-180" : ""}`} />
                )}
              </button>
            ) : (
              // NORMAL LINK
              nav.path && (
                <Link
                  to={nav.path}
                  className={`menu-item ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                >
                  <span className="menu-item-icon-size">
                    {isActive(nav.path) ? nav.iconFilled : nav.iconOutline}
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}

            {/* SUBMENU CONTENT (Admin only) */}
            {nav.subItems && role === "Admin" && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => { subMenuRefs.current[key] = el; }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: opened ? `${subMenuHeight[key] || 0}px` : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        to={sub.path}
                        className={`menu-dropdown-item ${isActive(sub.path) ? "menu-dropdown-item-active" : ""}`}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 mt-16 lg:mt-0 h-screen bg-white dark:bg-gray-900 transition-all border-r 
        ${isExpanded || isMobileOpen || isHovered ? "w-[290px]" : "w-[90px]"} 
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LOGO */}
      <div
        className={`py-8 flex ${
          isExpanded || isHovered ? "justify-start" : "justify-center"
        }`}
      >
        <Link to="/app">
          {isExpanded || isHovered ? (
            <img src={logoFull} width={150} height={40} />
          ) : (
            <img src={logoSmall} width={32} height={32} />
          )}
        </Link>
      </div>

      {/* NAVIGATION */}
      <div className="flex flex-col overflow-y-auto">
        <nav className="p-2 mb-6">
          <h2 className="menu-section-title">
            {isExpanded || isHovered ? "Menu" : <IoEllipsisHorizontal size={22} />}
          </h2>

          {renderMenuItems(visibleNavItems, "main")}
        </nav>
      </div>
    </aside>
  );
}
