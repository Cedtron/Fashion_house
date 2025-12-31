import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from '../utils/axios';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Cookies from "js-cookie";

interface Category {
  id: number;
  name: string;
  subCategories?: any[];
}

interface CategoryFormData {
  name: string;
}

interface User {
  username: string;
  userId?: number;
  id?: number;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>();

  // Get user from cookies
  useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        toast.error("Failed to load user data");
      }
    }
  }, []);

  // Fetch categories for the table
  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories ❌");
    }
  };
 
  // Fetch all categories for dropdown
  const fetchAllCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories for dropdown ❌");
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAllCategories();
  }, []);

  // Save or update category
  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, data); // Changed to PATCH
        toast.success("Category updated successfully ✅");
      } else {
        await api.post("/categories", data); // Correct endpoint
        toast.success("Category added successfully ✅");
      }
      reset();
      setEditingId(null);
      fetchCategories();
      fetchAllCategories();
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 409) {
        toast.error("Category name already exists ❌");
      } else {
        toast.error(error.response?.data?.message || "Error saving category ❌");
      }
    }
  };

  const handleEdit = (item: Category) => {
    setEditingId(item.id);
    setValue("name", item.name); // Changed from "category" to "name"
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`); // Correct endpoint
      toast.success("Category deleted successfully 🗑️");
      fetchCategories();
      fetchAllCategories();
    } catch (error) {
      console.error(error);
      toast.error("Error deleting category ❌");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset();
  };

  return (
    <div>
      <PageMeta
        title="Categories | Fashion House"
        description="Manage categories and subcategories for Fashion House stock management system"
      />
      <PageBreadcrumb pageTitle="Categories" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

        <div className="w-full max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 mb-6 sm:flex-row">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Category Management
            </h3>
         
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3"
          >
            <div>
              <input
                type="text"
                {...register("name", { 
                  required: "Category name is required",
                  minLength: {
                    value: 2,
                    message: "Category name must be at least 2 characters"
                  }
                })}
                placeholder="Enter category name"
                className={`w-full rounded-md border px-4 py-2 text-sm focus:border-coffee-500 focus:outline-none ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } dark:bg-gray-800 dark:text-white dark:border-gray-700`}
                aria-label="Category Name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm font-medium text-white bg-coffee-600 rounded-md hover:bg-coffee-700"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm dark:border-gray-800">
            <table className="w-full text-sm table-auto">
              <thead className="bg-gray-100 dark:bg-white/[0.05]">
                <tr>
                  <th className="px-4 py-3 font-medium text-left text-gray-600 dark:text-gray-300">#</th>
                  <th className="px-4 py-3 font-medium text-left text-gray-600 dark:text-gray-300">Category Name</th>
                  <th className="px-4 py-3 font-medium text-center text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length > 0 ? (
                  categories.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">
                        {item.name} {/* Changed from item.category to item.name */}
                        {item.subCategories && item.subCategories.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({item.subCategories.length} subcategories)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-yellow-400 rounded hover:bg-yellow-500"
                          >
                            <FiEdit /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
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
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No categories found.
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