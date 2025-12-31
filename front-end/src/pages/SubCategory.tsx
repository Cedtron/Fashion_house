import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from '../utils/axios';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiEdit, FiTrash2, FiPlus, FiArrowRight } from "react-icons/fi";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";

interface Category {
  id: number;
  name: string;
}

interface SubCategory {
  id: number;
  name: string;
  category: Category;
}

interface SubCategoryFormData {
  name: string;
  categoryId: number;
}

interface User {
  username: string;
}

export default function SubCategory() {
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SubCategoryFormData>();

  // Get user from cookies
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

  // Fetch subcategories for the table
  const fetchSubcategories = async () => {
    try {
      const res = await api.get('/subcategories');
      setSubcategories(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load subcategories ❌");
    }
  };
 
  // Fetch all categories for dropdown
  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories for dropdown ❌");
    }
  };

  useEffect(() => {
    fetchSubcategories();
    fetchCategories();
  }, []);

  // Save or update subcategory
  const onSubmit = async (data: SubCategoryFormData) => {
    try {
      if (editingId) {
        await api.patch(`/subcategories/${editingId}`, data);
        toast.success("Subcategory updated successfully ✅");
      } else {
        await api.post("/subcategories", data);
        toast.success("Subcategory added successfully ✅");
      }
      reset();
      setEditingId(null);
      fetchSubcategories();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Error saving subcategory ❌");
    }
  };

  const handleEdit = (item: SubCategory) => {
    setEditingId(item.id);
    setValue("name", item.name);
    setValue("categoryId", item.category.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;
    try {
      await api.delete(`/subcategories/${id}`);
      toast.success("Subcategory deleted successfully 🗑️");
      fetchSubcategories();
    } catch (error) {
      console.error(error);
      toast.error("Error deleting subcategory ❌");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset();
  };

  return (
    <div>
      <PageMeta
        title="Subcategories | Fashion House"
        description="Manage subcategories for Fashion House stock management system"
      />
      <PageBreadcrumb pageTitle="Subcategories" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <h3 className="font-semibold text-gray-800 text-xl dark:text-white/90">
              Subcategory Management
            </h3>

            {user && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Logged in as: <strong>{user.username}</strong>
              </div>
            )}

            <Link
              to="/app/category"
              className="inline-flex items-center gap-2 rounded-md bg-coffee-600 px-4 py-2 text-sm font-medium text-white hover:bg-coffee-700"
            >
              Categories <FiArrowRight />
            </Link>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div>
              <select
                {...register("categoryId", { 
                  required: "Category is required",
                  valueAsNumber: true 
                })}
                className={`w-full rounded-md border px-4 py-2 text-sm focus:border-coffee-500 focus:outline-none ${
                  errors.categoryId ? "border-red-500" : "border-gray-300"
                } dark:bg-gray-800 dark:text-white dark:border-gray-700`}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                {...register("name", { 
                  required: "Subcategory name is required",
                  minLength: {
                    value: 2,
                    message: "Subcategory name must be at least 2 characters"
                  }
                })}
                placeholder="Subcategory Name"
                className={`w-full rounded-md border px-4 py-2 text-sm focus:border-coffee-500 focus:outline-none ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } dark:bg-gray-800 dark:text-white dark:border-gray-700`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-coffee-600 px-4 py-2 text-sm font-medium text-white hover:bg-coffee-700"
              >
                {editingId ? (
                  <>
                    <FiEdit /> Update
                  </>
                ) : (
                  <>
                    <FiPlus /> Add
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm dark:border-gray-800">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-100 dark:bg-white/[0.05]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Subcategory</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.length > 0 ? (
                  subcategories.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">
                        {item.category.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-400">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1 rounded bg-yellow-400 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-500"
                          >
                            <FiEdit /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No subcategories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}