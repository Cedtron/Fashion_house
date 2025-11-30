import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import api from '../utils/axios';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import { FiUser, FiMail, FiPhone, FiShield, FiClock, FiEdit, FiCamera, FiMapPin, FiEye, FiEyeOff } from "react-icons/fi";

type User = {
  id: number;
  email: string;
  username: string;
  phone?: string;
  role: string;
  imagePath?: string;
  isActive: boolean;
  passwordhint?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Function to generate random color based on string
const getAvatarColor = (str: string): string => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userData = Cookies.get("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const response = await api.get(`/users/${parsedUser.id}`);
          setUser(response.data);
        } else {
          toast.error("User not found. Please log in again.");
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleEdit = (field: string, currentValue: string = "") => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = async () => {
    if (!user || !editingField) return;

    try {
      const updateData = { [editingField]: editValue };
      await api.patch(`/users/${user.id}`, updateData);
      
      setUser(prev => prev ? { ...prev, ...updateData } : null);
      setEditingField(null);
      setEditValue("");
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            User Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in again to view your profile.
          </p>
        </div>
      </div>
    );
  }

  const getUserInitial = (username: string): string => {
    return username?.charAt(0)?.toUpperCase() || 'U';
  };

  return (
    <>
      <PageMeta
        title={`${user.username}'s Profile | Your App Name`}
        description={`Profile page for ${user.username} - View and manage your account information`}
      />
      <PageBreadcrumb pageTitle="My Profile" />
      
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          My Profile
        </h3>
        
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Image */}
              <div className="relative">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-medium text-2xl ${
                  user.imagePath ? '' : getAvatarColor(user.username)
                }`}>
                  {user.imagePath ? (
                    <img 
                      src={user.imagePath} 
                      alt={user.username}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    getUserInitial(user.username)
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-lg">
                  <FiCamera size={16} />
                </button>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {user.username}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-lg">{user.email}</p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    user.role === 'Manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    user.role === 'Staff' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {user.role}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      user.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-gray-800 dark:text-white">
                Personal Information
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiUser className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Username
                  </p>
                  {editingField === 'username' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-gray-900 dark:text-white dark:bg-gray-700"
                        autoFocus
                      />
                      <button
                        onClick={handleSave}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 dark:text-white font-medium">
                        {user.username}
                      </p>
                      <button
                        onClick={() => handleEdit('username', user.username)}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <FiEdit size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiMail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Email Address
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiPhone className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Phone Number
                  </p>
                  {editingField === 'phone' ? (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-gray-900 dark:text-white dark:bg-gray-700"
                        autoFocus
                      />
                      <button
                        onClick={handleSave}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 dark:text-white font-medium">
                        {user.phone || "Not provided"}
                      </p>
                      <button
                        onClick={() => handleEdit('phone', user.phone || '')}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <FiEdit size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiShield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Role
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiClock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Member Since
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  <FiEdit className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Last Updated
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(user.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Password Hint */}
            {user.passwordhint && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Password Hint
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      {user.passwordhint}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Status Card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-gray-800 dark:text-white">
                Account Status
              </h4>
            </div>

            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-lg font-semibold mb-2">Account Overview</h5>
                  <p className="text-indigo-100">
                    Your account is <span className="font-bold">{user.isActive ? 'Active' : 'Inactive'}</span> and 
                    you have {user.isActive ? 'full access' : 'limited access'} to system features.
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  user.isActive 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}