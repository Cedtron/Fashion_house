import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useForm } from "react-hook-form";
import { FiSun, FiMoon, FiSave, FiUpload, FiLock, FiActivity, FiRefreshCw } from "react-icons/fi";
import { LuShoppingBag } from "react-icons/lu";
import api from "../utils/axios";
import PageLoader from "../components/common/PageLoader";
export default function Settings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const { register, handleSubmit } = useForm<{ shopName: string; contact: string; email: string }>();
  const { register: passRegister, handleSubmit: handlePassSubmit, reset: resetPass } = useForm<{ password: string; confirm: string }>();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const saveShopInfo = (data: any) => {
    toast.success("Shop info saved successfully ✅");
    console.log("Shop Info:", data);
  };

 

  const backupData = () => toast.success("Backup created successfully ✅");
  const restoreData = () => toast.success("Restore completed successfully ✅");

  const changePassword = async (data: any) => {
    if (data.password !== data.confirm) return toast.error("Passwords do not match ❌");
    
    try {
      // Get current user ID from localStorage or context
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        toast.error("User not found. Please login again.");
        return;
      }

      console.log('🔄 Changing password for current user:', currentUser.id);
      
      await api.patch(`/users/${currentUser.id}`, {
        password: data.password
      });
      
      toast.success("Password changed successfully ✅");
      resetPass();
    } catch (error: any) {
      console.error('❌ Password change error:', error);
      toast.error(error.response?.data?.message || "Failed to change password ❌");
    }
  };

  const fetchActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await api.get("/logs?limit=50");
      setActivityLogs(response.data || []);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
      toast.error("Failed to load activity feed");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  return (
    <div>
      <PageMeta title="Settings | Fashion House" description="Manage shop settings" />
      <PageBreadcrumb pageTitle="Settings" />
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      <div className="min-h-screen space-y-8">
        {/* Shop Info */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 xl:p-8 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <LuShoppingBag /> Shop / Company Info
          </h3>
          <form onSubmit={handleSubmit(saveShopInfo)} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">Shop Name</label>
              <input type="text" {...register("shopName")} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" placeholder="Fashion House" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">Contact</label>
              <input type="text" {...register("contact")} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" placeholder="+256 700 000000" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">Email</label>
              <input type="email" {...register("email")} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" placeholder="info@fashionhouse.com" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full" />
              {logoPreview && <img src={logoPreview} alt="Logo Preview" className="mt-2 h-20 w-20 object-contain rounded border" />}
            </div>
            <button type="submit" className="btn btn-indigo flex items-center gap-2"><LuShoppingBag /> Save Info</button>
          </form>
        </div>

     

        {/* Backup & Restore */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 xl:p-8 shadow-sm flex gap-4 flex-wrap">
          <h3 className="w-full flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <FiSave /> Backup & Restore
          </h3>
          <button onClick={backupData} className="btn btn-green flex items-center gap-2"><FiSave /> Backup</button>
          <button onClick={restoreData} className="btn btn-yellow flex items-center gap-2"><FiUpload /> Restore</button>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 xl:p-8 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <FiLock /> Change Password
          </h3>
          <form onSubmit={handlePassSubmit(changePassword)} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">New Password</label>
              <input type="password" {...passRegister("password")} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" placeholder="Enter new password" />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-600 dark:text-gray-300">Confirm Password</label>
              <input type="password" {...passRegister("confirm")} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800" placeholder="Confirm new password" />
            </div>
            <button type="submit" className="btn btn-indigo flex items-center gap-2"><FiLock /> Change Password</button>
          </form>
        </div>

        {/* Activity Logs */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 xl:p-8 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              <FiActivity /> Recent Activity
            </div>
            <button
              onClick={fetchActivityLogs}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-coffee-600 hover:bg-coffee-700 disabled:opacity-60"
              disabled={logsLoading}
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>
          {logsLoading ? (
            <PageLoader label="Loading activity..." fullHeight={false} />
          ) : activityLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity captured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 uppercase text-xs border-b">
                    <th className="py-2">Action</th>
                    <th className="py-2">User</th>
                    <th className="py-2">Route</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium text-gray-800">{log.action}</div>
                        <div className="text-xs text-gray-500">{log.message}</div>
                      </td>
                      <td className="py-3 text-gray-700">{log.username || log.userId || "System"}</td>
                      <td className="py-3 text-xs text-gray-500">{log.path}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            log.level === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {log.statusCode || "OK"}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
