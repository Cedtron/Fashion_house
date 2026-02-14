import { useState, useEffect } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link } from "react-router-dom";
import { FaCog, FaQuestionCircle, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import Cookies from "js-cookie";
import SupportModal from "../modals/SupportModal";
import { getImageUrl } from "../../utils/imageUtils";

interface UserType {
  id: number;
  username: string;
  email: string;
  imagePath?: string | null;
  role?: string;
}

const getRandomColor = (str: string | undefined): string => {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
    "bg-orange-500", "bg-cyan-500"
  ];
  if (!str) return "bg-gray-500";
  const index = str.charCodeAt(0) % colors.length;
  return colors[index];
};

const getFirstLetter = (username: string | undefined) =>
  username ? username.charAt(0).toUpperCase() : "U";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const loadUserData = () => {
      const userData = Cookies.get("user");
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error("Error parsing user cookie:", error);
        }
      } else {
        // Fallback to localStorage if cookies don't work
        const userFromStorage = localStorage.getItem("user");
        if (userFromStorage) {
          try {
            setUser(JSON.parse(userFromStorage));
          } catch (error) {
            console.error("Error parsing user from localStorage:", error);
          }
        }
      }
    };

    // Load initially
    loadUserData();

    // Listen for storage changes (when user logs in)
    const handleStorageChange = () => {
      loadUserData();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for when login completes
    window.addEventListener('userLoggedIn', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const userColor = getRandomColor(user?.username);
  const userInitial = getFirstLetter(user?.username);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
          {user?.imagePath ? (
            <img 
              src={getImageUrl(user.imagePath)}
              alt={user.username}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide the image and show initials instead
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full flex items-center justify-center text-white font-semibold text-lg ${userColor}`}
            style={{ display: user?.imagePath ? 'none' : 'flex' }}
          >
            {userInitial}
          </div>
        </span>

        <span className="block mr-1 font-medium text-theme-sm">
          {user?.username || "User"}
        </span>

        <FaChevronDown
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] w-[260px] flex flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {user?.username}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user?.email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/app/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <FaCog />
              Account Settings
            </DropdownItem>
          </li>

          <li>
            <button
              onClick={() => setSupportOpen(true)}
              className="flex items-center gap-3 w-full text-left px-3 py-2 font-medium text-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <FaQuestionCircle />
              Support
            </button>
          </li>
        </ul>

        {/* Logout button */}
        <button
          onClick={() => {
            // Clear all auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            Cookies.remove('token');
            Cookies.remove('user');
            
            // Redirect to signin page
            window.location.href = "/signin";
          }}
          className="flex items-center bg-red-400 gap-3 px-3 py-2 mt-3 w-full text-left font-medium text-gray-100 rounded-lg hover:bg-red-500 dark:hover:bg-red/5"
        >
          <FaSignOutAlt color="white"/>
          Sign out
        </button>

        {/* Dev Footer */}
        <div className="mt-4 text-center text-gray-500 text-xs">
          Built by <span className="font-semibold">Cedodeveloper</span>
          <br />
          📧 cedodeveloper@gmail.com
        </div>
      </Dropdown>

      {/* Support Modal */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
