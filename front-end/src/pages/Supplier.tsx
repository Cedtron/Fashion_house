import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { FiEdit, FiTrash2, FiEye, FiPlus } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../utils/axios";
import Cookies from "js-cookie";

// Define the Supplier type
interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define the form data type
interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  notes: string;
  isActive: boolean;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get user data from cookies
  useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        toast.error("Failed to load user data");
      }
    }
  }, []);

  // Fetch suppliers from API
const fetchSuppliers = async () => {
  try {
    setLoading(true);
    const res = await api.get("suppliers");

    if (res.data.success) {
      setSuppliers(res.data.data); // <-- ONLY the data array
      console.log("Fetched suppliers:", res.data.data);
    } else {
      toast.error("Failed to fetch suppliers");
      console.error("API returned success: false", res.data);
    }
  } catch (error) {
    toast.error("Failed to fetch suppliers");
    console.error("Error fetching suppliers:", error);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchSuppliers();
  }, []);

  const { register, handleSubmit, reset } = useForm<SupplierFormData>({
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      postalCode: "",
      notes: "",
      isActive: true,
    },
  });

  const handleAdd = () => {
    reset({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      postalCode: "",
      notes: "",
      isActive: true,
    });
    setEditingSupplier(null);
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "",
      postalCode: supplier.postalCode || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive,
    });
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const handleView = (supplier: Supplier) => {
    setViewSupplier(supplier);
    setViewModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    try {
      await api.delete(`suppliers/${id}`);
      setSuppliers(suppliers.filter((s) => s.id !== id));
      toast.success("Supplier deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete supplier");
      console.error("Error deleting supplier:", error);
    }
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      // Add user information to the data
      const submitData = {
        ...data,
        // You can add user tracking info if needed
        username: user?.username,
      };

      if (editingSupplier) {
        // Update existing supplier
        const response = await api.patch(`suppliers/${editingSupplier.id}`, submitData);
        setSuppliers(suppliers.map((s) => s.id === editingSupplier.id ? response.data : s));
        toast.success("Supplier updated successfully!");
      } else {
        // Create new supplier
        const response = await api.post("suppliers", submitData);
        setSuppliers([...suppliers, response.data]);
        toast.success("Supplier added successfully!");
      }
      setShowModal(false);
    } catch (error) {
      toast.error(editingSupplier ? "Failed to update supplier" : "Failed to add supplier");
      console.error("Error saving supplier:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Toast Container - Add this at the top of your component */}
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Supplier Management
        </h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FiPlus /> Add Supplier
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading suppliers...</p>
        </div>
      )}

      {/* Supplier Table */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm overflow-x-auto">
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No suppliers found. Add your first supplier to get started.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                  <th className="py-3 px-3 text-left">Name</th>
                  <th className="py-3 px-3 text-left">Contact Person</th>
                  <th className="py-3 px-3 text-left">Email</th>
                  <th className="py-3 px-3 text-left">Phone</th>
                  <th className="py-3 px-3 text-left">City</th>
                  <th className="py-3 px-3 text-left">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: Supplier) => (
                  <tr
                    key={s.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="py-2 px-3">{s.name}</td>
                    <td className="py-2 px-3">{s.contactPerson || "-"}</td>
                    <td className="py-2 px-3">{s.email || "-"}</td>
                    <td className="py-2 px-3">{s.phone || "-"}</td>
                    <td className="py-2 px-3">{s.city || "-"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 px-3 flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleView(s)}
                        className="text-gray-500 hover:text-indigo-600 transition"
                        title="View Details"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={() => handleEdit(s)}
                        className="text-blue-500 hover:text-blue-700 transition"
                        title="Edit Supplier"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Delete Supplier"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    {...register("name", { required: true })}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    {...register("contactPerson")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    {...register("phone")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    {...register("address")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    {...register("city")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    {...register("country")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    {...register("postalCode")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register("isActive")}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Active Supplier
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition"
                >
                  {editingSupplier ? "Update Supplier" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && viewSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Supplier Details
            </h3>

            <div className="space-y-3 text-sm">
              <DetailRow label="Name" value={viewSupplier.name} />
              <DetailRow label="Contact Person" value={viewSupplier.contactPerson} />
              <DetailRow label="Email" value={viewSupplier.email} />
              <DetailRow label="Phone" value={viewSupplier.phone} />
              <DetailRow label="Address" value={viewSupplier.address} />
              <DetailRow label="City" value={viewSupplier.city} />
              <DetailRow label="Country" value={viewSupplier.country} />
              <DetailRow label="Postal Code" value={viewSupplier.postalCode} />
              <DetailRow label="Status" value={viewSupplier.isActive ? "Active" : "Inactive"} />
              <DetailRow label="Notes" value={viewSupplier.notes} />
              <DetailRow label="Created" value={formatDate(viewSupplier.createdAt)} />
              <DetailRow label="Last Updated" value={formatDate(viewSupplier.updatedAt)} />
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => setViewModal(false)}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
// Helper component for view modal details
const DetailRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex border-b dark:border-gray-700 pb-2 last:border-0">
    <strong className="text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
      {label}:
    </strong>
    <span className="text-gray-600 dark:text-gray-400 flex-1">
      {value || "-"}
    </span>
  </div>
);