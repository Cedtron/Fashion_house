import React, { useState, useEffect } from "react";
import api from '../utils/axios';
import { useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUpload, FiX, FiKey } from "react-icons/fi";
import { getImageUrl } from "../utils/imageUtils";

type User = {
  id: number;
  email: string;
  role: string;
  status: string;
  isActive?: boolean;
  username: string;
  phone?: string;
  imagePath?: string;
  passwordhint?: string;
};

type PasswordChangeData = {
  newPassword: string;
  confirmPassword: string;
};

// Fixed function to generate random color based on string
const getAvatarColor = (str: string | undefined): string => {
  if (!str) return 'bg-gray-500';

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

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formDragOver, setFormDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordChangeData>();

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch users");
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingUser) {
        // Update existing user
        const { password, ...updateData } = data;
        await api.patch(`/users/${editingUser.id}`, updateData);

        // Upload image if selected
        if (imageFile) {
          await uploadImage(editingUser.id, imageFile);
        }

        toast.success("User updated successfully!");
      } else {
        // Create new user
        const newUser = await api.post('/users', data);

        // Upload image if selected for new user
        if (imageFile) {
          await uploadImage(newUser.data.id, imageFile);
        }

        toast.success("User added successfully!");
      }

      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to save user");
    }
  };

  const uploadImage = async (userId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    await api.post(`/users/${userId}/image`, formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setValue("email", user.email);
    setValue("role", user.role);
    setValue("username", user.username);
    setValue("phone", user.phone);
    setValue("passwordhint", user.passwordhint);
    setImagePreview(user.imagePath || null);
    setImageFile(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/users/${id}`);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success("User deleted successfully!");
      } catch (e) {
        console.error(e);
        toast.error("Failed to delete user");
      }
    }
  };

  // Fixed status toggle - updates in DB
  const toggleStatus = async (user: User) => {
    try {
      const newStatus = !user.isActive; // Toggle isActive boolean
      await api.patch(`/users/${user.id}`, { isActive: newStatus });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: newStatus } : u
        )
      );
      toast.info(`${user.username} is now ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to update user status");
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setImagePreview(null);
    setImageFile(null);
    setShowPassword(false);
    reset();
  };

  // Image upload handlers for form
  const handleFormDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFormDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  const handleFormFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  const handleImageSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image file");
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  // Password change handlers
  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    resetPassword();
  };

  const onChangePassword = async (data: PasswordChangeData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      await api.patch(`/users/${selectedUser?.id}`, {
        password: data.newPassword
      });
      toast.success("Password changed successfully!");
      closePasswordModal();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  const newPassword = watch("newPassword");

  // View user handler
  const handleViewUser = (user: User) => {
    setViewUser(user);
  };

  const closeViewModal = () => {
    setViewUser(null);
  };

  // Get user initial safely
  const getUserInitial = (user: User): string => {
    return user.username?.charAt(0)?.toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen p-6 transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />


      {/* Header */}
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
          👥 User Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage system users and their permissions
        </p>
      </div>

      {/* Add/Edit Form */}
      <div className="p-6 mb-6 transition-colors duration-300 bg-white border border-gray-200 shadow-sm dark:bg-gray-800 rounded-2xl dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {editingUser ? "✏️ Edit User" : "👤 Add New User"}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Image Upload Section */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Profile Image
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${formDragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              onDrop={handleFormDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setFormDragOver(true);
              }}
              onDragLeave={() => setFormDragOver(false)}
            >
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="object-cover w-32 h-32 mx-auto mb-4 rounded-full"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute p-1 text-white transition-colors bg-red-500 rounded-full -top-2 -right-2 hover:bg-red-600"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    Image ready for upload
                  </p>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FiUpload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    Drag & drop an image here, or click to select
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFormFileInput}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="px-4 py-2 text-sm text-white transition-colors bg-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-700"
                  >
                    Select Image
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Email *
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Invalid email address"
                }
              })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message as string}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Username *
            </label>
            <input
              type="text"
              placeholder="johndoe"
              {...register("username", { required: "Username is required" })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message as string}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1234567890"
              {...register("phone")}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Role *
            </label>
            <select
              {...register("role", { required: "Role is required" })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">Select Role</option>
              <option value="Admin">Admin</option>

              <option value="Saler">Saler</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message as string}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Password Hint
            </label>
            <input
              type="text"
              placeholder="Hint to remember password"
              {...register("passwordhint")}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Password field only for new users */}
          {!editingUser && (
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                  })}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message as string}</p>
              )}
            </div>
          )}

          <div className="flex items-end gap-3 md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
            >
              {editingUser ? "Update User" : "Add User"}
            </button>
            {editingUser && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden transition-colors duration-300 bg-white border border-gray-200 shadow-sm dark:bg-gray-800 rounded-2xl dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Users List ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  User
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Contact
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm mr-3 ${user.imagePath ? '' : getAvatarColor(user.username)
                        }`}>
                        {user.imagePath ? (
                          <img
                            src={getImageUrl(user.imagePath)}
                            alt={user.username}
                            className="object-cover w-10 h-10 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add(getAvatarColor(user.username));
                            }}
                          />
                        ) : (
                          getUserInitial(user)
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                    {user.phone && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      user.role === 'Manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        user.role === 'Staff' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.isActive}
                        onChange={() => toggleStatus(user)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="p-2 text-green-600 transition-colors rounded-lg hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
                        title="View User"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="p-2 text-blue-600 transition-colors rounded-lg hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Change Password"
                      >
                        <FiKey size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-yellow-600 transition-colors rounded-lg hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                        title="Edit User"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 transition-colors rounded-lg hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete User"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 transition-all transform bg-white shadow-xl dark:bg-gray-800 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🔐 Change Password for {selectedUser.username}
              </h3>
              <button
                onClick={closePasswordModal}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    {...registerPassword("newPassword", {
                      required: "New password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" }
                    })}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...registerPassword("confirmPassword", {
                      required: "Please confirm your password",
                      validate: value => value === newPassword || "Passwords do not match"
                    })}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 transition-all transform bg-white shadow-xl dark:bg-gray-800 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                👤 User Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-medium text-xl ${viewUser.imagePath ? '' : getAvatarColor(viewUser.username)
                  }`}>
                  {viewUser.imagePath ? (
                    <img
                      src={getImageUrl(viewUser.imagePath)}
                      alt={viewUser.username}
                      className="object-cover w-16 h-16 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add(getAvatarColor(viewUser.username));
                      }}
                    />
                  ) : (
                    getUserInitial(viewUser)
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewUser.username}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">{viewUser.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewUser.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {viewUser.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {viewUser.passwordhint && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Password Hint</label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewUser.passwordhint}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 font-medium text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}