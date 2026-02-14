import React, { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiX, FiEye, FiCopy, FiDroplet, FiCamera, FiImage } from "react-icons/fi";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import api from '../utils/axios';
import Cookies from "js-cookie";
import { getImageUrl } from '../utils/imageUtils';

interface Category {
  id: number;
  name: string;
}

interface Shade {
  id?: number;
  colorName: string;
  color: string;
  quantity: number;
  unit: string;
  length: number;
  lengthUnit: string;
}

interface Stock {
  id: number;
  stockId: string;
  product: string;
  category: string;
  quantity: number;
  cost: number;
  price: number;
  imagePath?: string;
  shades: Shade[];
  createdAt: string;
  updatedAt: string;
}

interface StockFormData {
  product: string;
  category: string;
  subcategoryId: number;
  quantity: number;
  cost: number;
  price: number;
  shades: Shade[];
}

// Color name mapping for auto-fill
const colorNames: { [key: string]: string } = {
  "#ff0000": "Red",
  "#00ff00": "Green",
  "#0000ff": "Blue",
  "#ffff00": "Yellow",
  "#ff00ff": "Magenta",
  "#00ffff": "Cyan",
  "#000000": "Black",
  "#ffffff": "White",
  "#808080": "Gray",
  "#c0c0c0": "Silver",
  "#ffa500": "Orange",
  "#800080": "Purple",
  "#a52a2a": "Brown",
  "#ffc0cb": "Pink",
  "#008000": "Dark Green",
  "#000080": "Navy Blue",
  "#800000": "Maroon",
  "#808000": "Olive",
  "#008080": "Teal",
  "#f5f5dc": "Beige",
  "#fffacd": "Lemon Chiffon",
  "#ffe4e1": "Misty Rose",
  "#e6e6fa": "Lavender",
  "#f0e68c": "Khaki",
  "#d2b48c": "Tan",
  "#bc8f8f": "Rosy Brown",
  "#daa520": "Golden Rod",
  "#cd853f": "Peru",
  "#b8860b": "Dark Golden Rod"
};

// Function to extract dominant colors from image
const extractDominantColorsFromImage = (imageUrl: string, maxColors: number = 8): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      // Resize for performance but maintain good color detection
      const maxWidth = 150;
      const maxHeight = 150;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const colorMap = new Map();

      // Sample pixels strategically to get dominant colors
      for (let i = 0; i < pixels.length; i += 12) { // Sample every 12th pixel
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Group similar colors together
        const roundedR = Math.round(r / 32) * 32;
        const roundedG = Math.round(g / 32) * 32;
        const roundedB = Math.round(b / 32) * 32;
        const groupedColor = `#${((1 << 24) + (roundedR << 16) + (roundedG << 8) + roundedB).toString(16).slice(1)}`;

        colorMap.set(groupedColor, (colorMap.get(groupedColor) || 0) + 1);
      }

      // Sort by frequency and get top colors
      const dominantColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxColors)
        .map(([color]) => color);

      console.log(`Found ${dominantColors.length} dominant colors`);
      resolve(dominantColors);
    };

    img.onerror = () => {
      console.error('Failed to load image for color extraction');
      resolve([]);
    };
  });
};

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [editItem, setEditItem] = useState<Stock | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string>("Admin");
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isScanningColors, setIsScanningColors] = useState(false);
  const [isColorPickerActive, setIsColorPickerActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Image search states
  const [searchImageModalOpen, setSearchImageModalOpen] = useState(false);
  const [searchImageFile, setSearchImageFile] = useState<File | null>(null);
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { register, control, handleSubmit, reset, setValue, watch } = useForm<StockFormData>({
    defaultValues: {
      product: "",
      category: "",
      subcategoryId: 0,
      quantity: 0,
      cost: 0,
      price: 0,
      shades: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "shades",
  });

  // Watch category and shades
  const watchedCategory = watch("category");
  const watchedSubcategoryId = watch("subcategoryId");
  const watchedShades = watch("shades") || [];

  // Get user from cookies on component mount
  useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username || "Admin");
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    fetchCategories();
    fetchSubcategories();
    fetchStocks();
  }, []);

  // Update category when subcategory changes
  useEffect(() => {
    if (watchedSubcategoryId && watchedSubcategoryId > 0) {
      const selectedSubcategory = subcategories.find(sub => sub.id === watchedSubcategoryId);
      if (selectedSubcategory) {
        setValue("category", selectedSubcategory.category.name);
      }
    }
  }, [watchedSubcategoryId, subcategories, setValue]);

  // Auto compute total quantity when shades change for Fabric category
  useEffect(() => {
    if (watchedCategory === "Fabric") {
      const total = watchedShades.reduce(
        (acc, shade) => acc + (Number(shade.quantity) || 0),
        0
      );
      setValue("quantity", total);
    }
  }, [watchedShades, watchedCategory, setValue]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error("Failed to load categories");
    }
  };

  const fetchSubcategories = async () => {
    try {
      const response = await api.get('/subcategories');
      setSubcategories(response.data);
    } catch (error: any) {
      console.error('Error fetching subcategories:', error);
      toast.error("Failed to load subcategories");
    }
  };

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/stock');
      setStocks(response.data);
    } catch (error: any) {
      console.error('Error fetching stocks:', error);
      toast.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  };

  // Function to get color name from hex value - use color code if not found
  const getColorName = (hexColor: string): string => {
    const normalizedHex = hexColor.toLowerCase();

    // Check for exact match first
    if (colorNames[normalizedHex]) {
      return colorNames[normalizedHex];
    }

    // If no exact match, just return the color code itself
    return normalizedHex;
  };

  // Function to handle color picker change - auto-fill color name with color code
  const handleColorPickerChange = (index: number, newColor: string) => {
    setValue(`shades.${index}.colorName`, newColor);
    setValue(`shades.${index}.color`, newColor);
  };

  // Function to copy color code to clipboard
  const copyColorCode = (colorCode: string) => {
    navigator.clipboard.writeText(colorCode).then(() => {
      toast.success("Color code copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy color code");
    });
  };

  // Function to scan image for dominant colors
  const scanImageForDominantColors = async () => {
    if (!preview) {
      toast.error("Please upload an image first");
      return;
    }

    setIsScanningColors(true);
    toast.info("Scanning for dominant colors...");

    try {
      const colors = await extractDominantColorsFromImage(preview, 8); // Get top 8 dominant colors

      if (colors.length > 0) {
        setExtractedColors(colors);
        toast.success(`Found ${colors.length} dominant colors in the image!`);
      } else {
        toast.info("No dominant colors found in the image");
      }
    } catch (error) {
      console.error('Error scanning image for colors:', error);
      toast.error("Failed to scan image for colors");
    } finally {
      setIsScanningColors(false);
    }
  };

  // Function to add extracted color as shade
  const addExtractedColorAsShade = (color: string) => {
    append({
      colorName: color,
      color: color,
      quantity: 1,
      unit: "Rolls",
      length: 10,
      lengthUnit: "Yards",
    });
    toast.success(`Added ${getColorName(color)} as shade`);
  };

  // Function to add all extracted colors as shades
  const addAllExtractedColorsAsShades = () => {
    extractedColors.forEach(color => {
      append({
        colorName: color,
        color: color,
        quantity: 1,
        unit: "Rolls",
        length: 10,
        lengthUnit: "Yards",
      });
    });
    toast.success(`Added all ${extractedColors.length} dominant colors as shades`);
    setExtractedColors([]); // Clear extracted colors after adding
  };

  // Function to handle image click for color picking
  const handleImageColorPick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isColorPickerActive || !preview) return;

    const img = e.currentTarget;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Get click coordinates relative to image
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale coordinates to match natural image size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const pixelX = Math.floor(x * scaleX);
    const pixelY = Math.floor(y * scaleY);

    // Get pixel color
    const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
    const hexColor = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;

    setPickedColor(hexColor);
    toast.success(`Picked color: ${hexColor}`);
  };

  // Function to add picked color as shade
  const addPickedColorAsShade = () => {
    if (!pickedColor) return;

    append({
      colorName: pickedColor,
      color: pickedColor,
      quantity: 1,
      unit: "Rolls",
      length: 10,
      lengthUnit: "Yards",
    });
    toast.success(`Added ${getColorName(pickedColor)} as shade`);
    setPickedColor(null);
  };

  // Function to toggle color picker mode
  const toggleColorPicker = () => {
    if (!preview) {
      toast.error("Please upload an image first");
      return;
    }

    setIsColorPickerActive(!isColorPickerActive);
    if (isColorPickerActive) {
      setPickedColor(null);
      toast.info("Color picker deactivated");
    } else {
      toast.info("Click on the image to pick colors! Click again to deactivate.");
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: StockFormData) => {
    setLoading(true);
    try {
      // Prepare JSON payload for create/update
      const payload: any = {
        product: data.product,
        category: data.category,
        subcategoryId: data.subcategoryId || null,
        quantity: Number(data.quantity) || 0,
        cost: Number(data.cost) || 0,
        price: Number(data.price) || 0,
      };

      if (data.category === "Fabric" && data.shades) {
        payload.shades = data.shades;
      }

      let savedStock: any = null;

      if (editItem) {
        // Update existing stock (PATCH)
        const res = await api.patch(`/stock/${editItem.id}`, payload);
        savedStock = res.data || (await api.get(`/stock/${editItem.id}`)).data;
        toast.success("Stock updated successfully!");
      } else {
        // Create new stock (POST)
        const res = await api.post('/stock', payload);
        savedStock = res.data;
        toast.success("Stock added successfully!");
      }

      // If there's an image file, upload it using the dedicated endpoint
      if (imageFile && savedStock && savedStock.id) {
        try {
          console.log(`[onSubmit] Uploading image for stock ${savedStock.id}`, imageFile);
          const fd = new FormData();
          fd.append('image', imageFile);

          // Don't set Content-Type header; let axios/browser set multipart boundary
          const uploadRes = await api.post(`/stock/${savedStock.id}/image`, fd, {
            headers: {
              // Remove Content-Type - browser will set it with correct boundary
            },
          });

          console.log('[onSubmit] Image upload response:', uploadRes.data);

          // update preview if available
          if (uploadRes.data?.imagePath) {
            setPreview(getImageUrl(uploadRes.data.imagePath));
          }

          toast.success('Image uploaded successfully!');
        } catch (uploadErr: any) {
          console.error('Image upload failed:', uploadErr);
          toast.error(uploadErr?.response?.data?.message || 'Image upload failed');
        }
      }

      // Refresh stocks and close modal
      await fetchStocks();
      closeModal();
    } catch (error: any) {
      console.error('Error saving stock:', error);
      toast.error(error.response?.data?.message || "Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete stock
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this stock item?")) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/stock/${id}`);
      toast.success("Stock deleted successfully!");
      await fetchStocks();
    } catch (error: any) {
      console.error('Error deleting stock:', error);
      toast.error("Failed to delete stock");
    } finally {
      setLoading(false);
    }
  };

  // Handle search by image
  const handleSearchByImage = async () => {
    if (!searchImageFile) {
      toast.error("Please upload an image to search");
      return;
    }

    setIsSearching(true);
    try {
      const formData = new FormData();
      formData.append('image', searchImageFile);

      const response = await api.post('/stock/search-by-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSearchResults(response.data);
      
      if (response.data.length === 0) {
        toast.info("No similar products found");
      } else {
        const method = response.data[0]?.searchMethod;
        const methodText = method === 'rekognition' ? 'Amazon Rekognition' : 'hash-based search';
        toast.success(`Found ${response.data.length} similar products using ${methodText}!`);
      }
    } catch (error: any) {
      console.error('Error searching by image:', error);
      toast.error(error.response?.data?.message || "Failed to search by image");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search image upload
  const handleSearchImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setSearchImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setSearchImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Close search modal
  const closeSearchModal = () => {
    setSearchImageModalOpen(false);
    setSearchImageFile(null);
    setSearchImagePreview(null);
    setSearchResults([]);
  };



  // Close modal function
  const closeModal = () => {
    setModalOpen(false);
    setViewModalOpen(false);
    setEditItem(null);
    setSelectedStock(null);
    setPreview(null);
    setImageFile(null);
    setExtractedColors([]);
    setIsColorPickerActive(false);
    setPickedColor(null);
    reset();
  };

  const openModal = (item: Stock | null = null) => {
    setEditItem(item);
    setExtractedColors([]); // Clear extracted colors when modal opens
    setIsColorPickerActive(false); // Reset color picker
    setPickedColor(null); // Reset picked color
    if (item) {
      setValue("product", item.product);
      setValue("category", item.category);
      setValue("quantity", item.quantity);
      setValue("cost", item.cost);
      setValue("price", item.price);
      setValue("shades", item.shades || []);
      
      // Find and set subcategory if it exists
      const matchingSubcategory = subcategories.find(sub => 
        sub.category.name === item.category
      );
      if (matchingSubcategory) {
        setValue("subcategoryId", matchingSubcategory.id);
      }
      
      setPreview(getImageUrl(item.imagePath));
    } else {
      reset();
      setPreview(null);
      setImageFile(null);
    }
    setModalOpen(true);
  };

  const openViewModal = (item: Stock) => {
    setSelectedStock(item);
    setViewModalOpen(true);
  };

  // Filter stocks based on search term
  const filteredStocks = stocks.filter(item =>
    item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.stockId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <PageMeta
        title="Stock Management - Fashion House"
        description="Manage and track your stock inventory for Fashion House fabrics and accessories"
      />
      <PageBreadcrumb pageTitle="Stock / Inventory Management" />

      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Username display for tracking */}
        <div className="p-3 mb-4 rounded-lg bg-gold-50 dark:bg-coffee-900/20">
          <p className="text-sm text-coffee-700 dark:text-gold-300">
            Current User: <strong>{username}</strong>
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 mb-5 sm:flex-row">
          <div className="flex items-center w-full gap-2 sm:w-auto">
            <FiSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Search product or stock ID..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none sm:w-64 focus:ring-2 focus:ring-coffee-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStocks()}
              className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              title="Clear filters"
            >
              Clear
            </button>

            <button
              onClick={() => setSearchImageModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white transition-all rounded-lg bg-blue-600 hover:bg-blue-700"
              title="Search by Image"
            >
              <FiCamera /> Search by Image
            </button>

            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 text-white transition-all rounded-lg bg-coffee-600 hover:bg-coffee-700"
            >
              <FiPlus /> Add Stock
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-coffee-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Stock ID</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-center">Category</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">Cost</th>
                  <th className="p-3 text-center">Price</th>
                  <th className="p-3 text-left">Shades</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStocks.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-700">
                    <td className="p-3 font-mono font-semibold text-coffee-600">
                      {item.stockId}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product}</span>
                        {item.imagePath && (
                          <img
                            src={getImageUrl(item.imagePath)}
                            alt={item.product}
                            className="object-cover w-8 h-8 mt-1 rounded"
                            onError={(e) => {
                              console.error('Failed to load stock image:', getImageUrl(item.imagePath));
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-center">{item.quantity}</td>
                    <td className="p-3 text-center">Ugx {item.cost.toFixed(2)}</td>
                    <td className="p-3 text-center">Ugx {item.price.toFixed(2)}</td>
                    <td className="p-3">
                      {item.shades?.length > 0 ? (
                        <div className="text-xs">
                          <span className="font-semibold">{item.shades.length} shades</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.shades.slice(0, 3).map((shade, idx) => (
                              <div
                                key={idx}
                                className="w-3 h-3 border rounded-sm"
                                style={{ backgroundColor: shade.color || "#000" }}
                                title={shade.colorName}
                              />
                            ))}
                            {item.shades.length > 3 && (
                              <span className="text-gray-500">+{item.shades.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 space-x-1 text-center">
                      <button
                        onClick={() => openViewModal(item)}
                        className="p-1 text-green-500 rounded hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
                        title="View Details"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={() => openModal(item)}
                        className="p-1 text-coffee-500 rounded hover:text-coffee-700 hover:bg-gold-50 dark:hover:bg-coffee-900/30"
                        title="Edit"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-red-500 rounded hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      {stocks.length === 0 ? "No stock items found. Add your first stock item!" : "No matching stock items found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl shadow-lg relative overflow-auto max-h-[90vh]">
              <h2 className="mb-4 text-xl font-semibold dark:text-white">
                {editItem ? `Edit Stock Item - ${editItem.stockId}` : "Add Stock Item"}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Product Name */}
                <div>
                  <input
                    {...register("product", { required: "Product name is required" })}
                    placeholder="Enter product name (e.g., Cotton Fabric, Silk Material)"
                    className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-coffee-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">Name of the product or material</p>
                </div>

                {/* Fabric Mode Switch */}
                <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fabric Mode
                    </label>
                    <p className="text-xs text-gray-500">Enable to add color shades information</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchedCategory === "Fabric"}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue("category", "Fabric");
                          setValue("quantity", 0); // Reset quantity when switching to fabric mode
                        } else {
                          setValue("category", "");
                          setValue("shades", []);
                          setValue("quantity", 0);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-coffee-500 dark:peer-focus:ring-coffee-400 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coffee-600"></div>
                  </label>
                </div>

                {/* Subcategory Selection (only show when not in fabric mode) */}
                {watchedCategory !== "Fabric" && (
                  <div>
                    <select
                      {...register("subcategoryId", { 
                        required: "Subcategory is required",
                        valueAsNumber: true 
                      })}
                      className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-coffee-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                      <option value="">Select Subcategory</option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.category.name} - {subcategory.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Choose product subcategory (category will be auto-selected)</p>
                  </div>
                )}

                {/* Hidden Category Field */}
                <input
                  type="hidden"
                  {...register("category")}
                />

                {/* Quantity and prices */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <input
                      {...register("quantity", {
                        required: "Quantity is required",
                        min: { value: 0, message: "Quantity cannot be negative" }
                      })}
                      type="number"
                      step="0.01"
                      placeholder={watchedCategory === "Fabric" ? "Auto-calculated from shades" : "Enter quantity"}
                      className={`px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-coffee-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${watchedCategory === "Fabric" ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                        }`}
                      readOnly={watchedCategory === "Fabric"}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {watchedCategory === "Fabric" ? "Total quantity from shades" : "Total quantity in stock"}
                    </p>
                  </div>

                  <div>
                    <input
                      {...register("cost", {
                        required: "Cost price is required",
                        min: { value: 0, message: "Cost cannot be negative" }
                      })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-coffee-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Cost price per unit</p>
                  </div>

                  <div>
                    <input
                      {...register("price", {
                        required: "Selling price is required",
                        min: { value: 0, message: "Price cannot be negative" }
                      })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-coffee-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Selling price per unit</p>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Product Image</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-coffee-700 hover:file:bg-gold-100 dark:file:bg-coffee-900 dark:file:text-gold-300"
                    />
                    {preview && watchedCategory === "Fabric" && (
                      <>
                        <button
                          type="button"
                          onClick={scanImageForDominantColors}
                          disabled={isScanningColors}
                          className="px-3 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isScanningColors ? "Scanning Colors..." : "Scan Dominant Colors"}
                        </button>
                        <button
                          type="button"
                          onClick={toggleColorPicker}
                          className={`px-3 py-2 text-sm rounded-md flex items-center gap-2 ${isColorPickerActive
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-600 text-white hover:bg-gray-700"
                            }`}
                        >
                          <FiDroplet />
                          {isColorPickerActive ? "Color Picker Active" : "Activate Color Picker"}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Hidden canvas for color picking */}
                  <canvas ref={canvasRef} className="hidden" />

                  {preview && (
                    <div className="relative mt-2">
                      <img
                        ref={imageRef}
                        src={preview}
                        alt="Preview"
                        className={`object-cover w-full max-w-xs border rounded-md ${isColorPickerActive ? 'cursor-crosshair ring-2 ring-green-500' : ''
                          }`}
                        onClick={handleImageColorPick}
                      />
                      {isColorPickerActive && (
                        <div className="absolute px-2 py-1 text-xs text-white rounded top-2 left-2 bg-black/70">
                          Click on image to pick colors
                        </div>
                      )}
                    </div>
                  )}

                  {/* Picked Color Display */}
                  {pickedColor && (
                    <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 border rounded-md"
                            style={{ backgroundColor: pickedColor }}
                          />
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200">
                              Picked Color: {getColorName(pickedColor)}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {pickedColor}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addPickedColorAsShade}
                          className="px-3 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                        >
                          Add as Shade
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">Upload product image (optional, max 5MB)</p>
                </div>

                {/* Extracted Colors Section */}
                {extractedColors.length > 0 && (
                  <div className="p-3 border rounded-lg bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Dominant Colors Found ({extractedColors.length})
                        </label>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Click on any color to add it as a shade
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addAllExtractedColorsAsShades}
                        className="px-3 py-1 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700"
                      >
                        Add All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extractedColors.map((color, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center cursor-pointer group"
                          onClick={() => addExtractedColorAsShade(color)}
                        >
                          <div
                            className="w-8 h-8 transition-all border rounded-md group-hover:ring-2 group-hover:ring-purple-500"
                            style={{ backgroundColor: color }}
                            title={`Click to add ${getColorName(color)}`}
                          />
                          <span className="mt-1 text-xs text-purple-700 truncate dark:text-purple-300 max-w-16">
                            {getColorName(color)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shades Section - Only show when Fabric Mode is enabled */}
                {watchedCategory === "Fabric" && (
                  <div className="pt-3 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fabric Color Shades</label>
                        <div className="text-xs text-gray-500">
                          Total Shades: {fields.length} | Total Quantity: {watchedShades.reduce((acc, shade) => acc + (Number(shade.quantity) || 0), 0)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          append({
                            colorName: "#000000",
                            color: "#000000",
                            quantity: 1,
                            unit: "Rolls",
                            length: 10,
                            lengthUnit: "Yards",
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg text-coffee-600 hover:text-coffee-800 dark:text-gold-300 dark:hover:text-gold-200 bg-gold-50 dark:bg-gold-900/30"
                      >
                        <FiPlus /> Add Shade
                      </button>
                    </div>

                    {fields.length > 0 && (
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                          >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {/* Color Name Input - This will be auto-filled with color code */}
                              <div>
                                <input
                                  {...register(`shades.${index}.colorName`)}
                                  placeholder="Color Name"
                                  className="w-full px-2 py-1 border rounded-md dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Color name (auto-filled)</p>
                              </div>

                              {/* Color Picker and Code Display */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={watchedShades[index]?.color || "#000000"}
                                    onChange={(e) => handleColorPickerChange(index, e.target.value)}
                                    className="w-12 h-12 p-0 border rounded dark:border-gray-500"
                                    title="Select color"
                                  />
                                  <div className="flex-1">
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={watchedShades[index]?.color || "#000000"}
                                        readOnly
                                        className="w-full px-2 py-1 font-mono text-xs bg-gray-100 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => copyColorCode(watchedShades[index]?.color || "#000000")}
                                        className="absolute p-1 text-gray-400 transform -translate-y-1/2 right-1 top-1/2 hover:text-gray-600 dark:hover:text-gray-300"
                                        title="Copy color code"
                                      >
                                        <FiCopy size={12} />
                                      </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Color code</p>
                                  </div>
                                </div>
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {getColorName(watchedShades[index]?.color || "#000000")}
                                </div>
                              </div>

                              {/* Quantity and Unit */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <input
                                    {...register(`shades.${index}.quantity`, {
                                      valueAsNumber: true,
                                      min: { value: 0, message: "Quantity cannot be negative" }
                                    })}
                                    type="number"
                                    placeholder="Qty"
                                    className="w-full px-2 py-1 border rounded-md dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">Quantity</p>
                                </div>
                                <div>
                                  <select
                                    {...register(`shades.${index}.unit`)}
                                    className="w-full px-2 py-1 border rounded-md dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                  >
                                    <option value="Rolls">Rolls</option>
                                    <option value="Pieces">Pieces</option>
                                    <option value="Meters">Meters</option>
                                    <option value="Yards">Yards</option>
                                  </select>
                                  <p className="mt-1 text-xs text-gray-500">Unit</p>
                                </div>
                              </div>

                              {/* Length and Length Unit */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <input
                                    {...register(`shades.${index}.length`, { valueAsNumber: true })}
                                    type="number"
                                    placeholder="Length"
                                    className="w-full px-2 py-1 border rounded-md dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">Length</p>
                                </div>
                                <div>
                                  <select
                                    {...register(`shades.${index}.lengthUnit`)}
                                    className="w-full px-2 py-1 border rounded-md dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                  >
                                    <option value="Yards">Yards</option>
                                    <option value="Meters">Meters</option>
                                    <option value="Inches">Inches</option>
                                    <option value="Feet">Feet</option>
                                  </select>
                                  <p className="mt-1 text-xs text-gray-500">Unit</p>
                                </div>
                              </div>
                            </div>

                            {/* Remove Button */}
                            <div className="flex justify-end mt-2">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 rounded hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <FiX size={14} /> Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {fields.length === 0 && (
                      <div className="py-6 text-center border-2 border-gray-300 border-dashed rounded-lg dark:border-gray-600">
                        <FiPlus className="mx-auto mb-2 text-gray-400" size={24} />
                        <p className="text-sm text-gray-500">No shades added yet</p>
                        <p className="text-xs text-gray-400">Click "Add Shade" to start adding color variations</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 transition-colors bg-gray-300 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-white transition-colors rounded-md bg-coffee-600 hover:bg-coffee-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : editItem ? "Update Stock" : "Add Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewModalOpen && selectedStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-lg relative overflow-auto max-h-[90vh]">
              <h2 className="mb-4 text-xl font-semibold dark:text-white">Stock Details - {selectedStock.stockId}</h2>

              <div className="space-y-4">
                {/* Product Image */}
                {selectedStock.imagePath && (
                  <div className="flex justify-center">
                    <img
                      src={getImageUrl(selectedStock.imagePath)}
                      alt={selectedStock.product}
                      className="object-cover w-32 h-32 border rounded-md"
                      onError={(e) => {
                        console.error('Failed to load stock image:', getImageUrl(selectedStock.imagePath));
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock ID</label>
                    <p className="font-mono text-lg font-semibold text-coffee-600">{selectedStock.stockId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Product Name</label>
                    <p className="text-lg font-semibold dark:text-white">{selectedStock.product}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                    <p className="text-lg font-semibold dark:text-white">{selectedStock.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantity</label>
                    <p className="text-lg font-semibold dark:text-white">{selectedStock.quantity}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost Price</label>
                    <p className="text-lg font-semibold dark:text-white">${selectedStock.cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Selling Price</label>
                    <p className="text-lg font-semibold dark:text-white">${selectedStock.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                    <p className="text-sm dark:text-white">{new Date(selectedStock.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                    <p className="text-sm dark:text-white">{new Date(selectedStock.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Shades Section */}
                {selectedStock.shades && selectedStock.shades.length > 0 && (
                  <div className="pt-4 border-t dark:border-gray-700">
                    <h3 className="mb-3 text-lg font-medium dark:text-white">Color Shades ({selectedStock.shades.length})</h3>
                    <div className="space-y-2">
                      {selectedStock.shades.map((shade, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 border rounded-sm"
                                style={{ backgroundColor: shade.color || "#000" }}
                              />
                              <div>
                                <p className="font-medium dark:text-white">{shade.colorName}</p>
                                <p className="text-xs text-gray-500">{shade.color}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
                              <p className="font-medium dark:text-white">{shade.quantity} {shade.unit}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Length</p>
                              <p className="font-medium dark:text-white">{shade.length} {shade.lengthUnit}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Detected Name</p>
                              <p className="text-xs font-medium dark:text-white">{getColorName(shade.color)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-white transition-colors rounded-md bg-coffee-600 hover:bg-coffee-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search by Image Modal */}
        {searchImageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-5xl shadow-lg relative overflow-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold dark:text-white">
                  <FiImage className="inline mr-2" />
                  Search by Image
                </h2>
                <button
                  onClick={closeSearchModal}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed rounded-lg dark:border-gray-600">
                    <label className="block mb-2 text-sm font-medium dark:text-white">
                      Upload Image to Search
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSearchImageChange}
                      className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {searchImagePreview && (
                      <div className="mt-3">
                        <img
                          src={searchImagePreview}
                          alt="Search preview"
                          className="object-contain w-full rounded-lg max-h-64"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSearchByImage}
                    disabled={!searchImageFile || isSearching}
                    className="w-full px-4 py-3 text-white transition-all rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSearching ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <FiSearch /> Search Similar Products
                      </>
                    )}
                  </button>

                  {isSearching && (
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-blue-600 animate-progress-bar"></div>
                    </div>
                  )}

                  <div className="p-3 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="font-medium text-blue-900 dark:text-blue-300">How it works:</p>
                    <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-400">
                      <li>• Fast hash-based search for exact/similar images</li>
                      <li>• AI-powered fallback for different angles/lighting</li>
                      <li>• Results show similarity percentage and method used</li>
                    </ul>
                  </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium dark:text-white">
                    Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                  </h3>
                  
                  {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg dark:border-gray-600">
                      <FiImage size={48} className="mb-3 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {isSearching ? 'Searching...' : 'Upload an image and click search to find similar products'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-96">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-4 border rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex gap-3">
                            {result.imagePath && (
                              <img
                                src={getImageUrl(result.imagePath)}
                                alt={result.product}
                                className="object-cover w-20 h-20 rounded"
                                onError={(e) => {
                                  console.error('Failed to load stock image:', getImageUrl(result.imagePath));
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold dark:text-white">{result.product}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{result.stockId}</p>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-bold ${result.similarity >= 80 ? 'text-green-600' : result.similarity >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                                    {result.similarity}%
                                  </div>
                                  <div className="text-xs px-2 py-1 rounded mt-1 inline-block" style={{
                                    backgroundColor: result.searchMethod === 'rekognition' ? '#f59e0b' : '#10b981',
                                    color: 'white'
                                  }}>
                                    {result.searchMethod === 'rekognition' ? '🔍 Rekognition' : '# Hash'}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Category:</span>{' '}
                                <span className="dark:text-white">{result.category}</span>
                                {' | '}
                                <span className="text-gray-600 dark:text-gray-400">Qty:</span>{' '}
                                <span className="dark:text-white">{result.quantity}</span>
                              </div>

                              {result.rekognitionExplanation && (
                                <div className="mt-2 p-2 text-xs bg-amber-50 dark:bg-amber-900/20 rounded">
                                  <p className="font-medium text-amber-900 dark:text-amber-300">Rekognition Analysis:</p>
                                  <p className="text-amber-800 dark:text-amber-400 mt-1">{result.rekognitionExplanation}</p>
                                </div>
                              )}

                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    closeSearchModal();
                                    openViewModal(result);
                                  }}
                                  className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    closeSearchModal();
                                    openModal(result);
                                  }}
                                  className="px-3 py-1 text-sm text-coffee-600 border border-coffee-600 rounded hover:bg-coffee-50 dark:hover:bg-coffee-900/20"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}