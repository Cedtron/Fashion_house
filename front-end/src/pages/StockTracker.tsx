import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../utils/axios';
import PageMeta from '../components/common/PageMeta';
import Cookies from 'js-cookie';
import { getImageUrl } from '../utils/imageUtils';
import {
  FiSearch,
  FiPackage,
  FiMinus,
  FiSave,
  FiRefreshCw,
  FiShoppingCart,
  FiCheck,
  FiX,
  FiPlus,
  FiCamera,
  FiImage,
  FiUpload,
  FiTrash2,
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
} from 'react-icons/fi';

interface Shade {
  id: number;
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

interface ReductionItem {
  stock: Stock;
  quantity: number;
  reason: string;
  selectedShades?: {
    shade: Shade;
    quantity: number;
  }[];
}

export default function StockReduction() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reductionItems, setReductionItems] = useState<ReductionItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [reductionQuantity, setReductionQuantity] = useState(1);
  const [username, setUsername] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [editingShades, setEditingShades] = useState<Map<number, { shade: Shade, reduction: number }>>(new Map());
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<Stock[]>([]);
  const [imageFilterActive, setImageFilterActive] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get username from cookies
  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username || 'System');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUsername('System');
      }
    }
  }, []);

  // Fetch all stocks
  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/stock');
      setStocks(response.data);
      setFilteredStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      toast.error('Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // Filter stocks
  useEffect(() => {
    let filtered = imageFilterActive && imageResults.length > 0 ? imageResults : stocks;

    if (searchTerm) {
      filtered = filtered.filter(stock =>
        stock.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.stockId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(stock =>
        stock.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    setFilteredStocks(filtered);
  }, [stocks, imageResults, imageFilterActive, searchTerm, categoryFilter]);

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Cannot access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const performImageSearch = async (file: Blob, filename = "upload.jpg") => {
    setImageSearchLoading(true);
    const fd = new FormData();
    fd.append("image", file, filename);
    try {
      const res = await api.post("/stock/search-by-photo", fd);
      const results: Stock[] = res.data || [];
      setImageResults(results);
      setImageFilterActive(true);
      if (results.length === 0) {
        toast.info("No inventory items matched that image");
      } else {
        toast.success(`Found ${results.length} matching item${results.length > 1 ? "s" : ""}`);
      }
    } catch (error: any) {
      console.error("Image search failed:", error);
      toast.error(error?.response?.data?.message || "Image search failed");
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    await performImageSearch(file, file.name);
    event.target.value = "";
  };

  const captureFrameAndSearch = async () => {
    if (!videoRef.current || !captureCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    setImagePreview(canvas.toDataURL("image/jpeg"));

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );

    if (blob) {
      await performImageSearch(blob, `capture-${Date.now()}.jpg`);
    } else {
      toast.error("Unable to capture image from camera");
    }
  };

  const clearImageResults = () => {
    setImageResults([]);
    setImageFilterActive(false);
    setImagePreview(null);
  };

  // Get unique categories
  const categories = [...new Set(stocks.map(stock => stock.category))];

  // Check if product is fabric
  const isFabricProduct = (stock: Stock) => {
    return stock.category.toLowerCase().includes('fabric') ||
      stock.category.toLowerCase().includes('cloth') ||
      (stock.shades && stock.shades.length > 0);
  };

  // Handle stock selection for reduction
  const handleStockSelect = (stock: Stock) => {
    setSelectedStock(stock);
    setReductionQuantity(1);

    const shadesMap = new Map();
    if (stock.shades) {
      stock.shades.forEach(shade => {
        shadesMap.set(shade.id, { shade, reduction: 0 });
      });
    }
    setEditingShades(shadesMap);
    stopCamera();
  };

  // Update shade reduction quantity
  const updateShadeReduction = (shadeId: number, reduction: number) => {
    const shadeData = editingShades.get(shadeId);
    if (shadeData && reduction >= 0 && reduction <= shadeData.shade.quantity) {
      const updatedShades = new Map(editingShades);
      updatedShades.set(shadeId, { ...shadeData, reduction });
      setEditingShades(updatedShades);
    }
  };

  // Calculate total shade reduction
  const getTotalShadeReduction = () => {
    return Array.from(editingShades.values()).reduce((total, item) => total + item.reduction, 0);
  };

  // Check if any shade reduction exists
  const hasShadeReductions = () => {
    return Array.from(editingShades.values()).some(item => item.reduction > 0);
  };

  // Add reduction item
  const addReductionItem = () => {
    if (!selectedStock) return;

    const isFabric = isFabricProduct(selectedStock);

    if (isFabric) {
      if (!hasShadeReductions()) {
        toast.error('Please reduce at least one color shade');
        return;
      }
    } else {
      if (reductionQuantity > selectedStock.quantity) {
        toast.error(`Cannot reduce more than available stock (${selectedStock.quantity})`);
        return;
      }

      if (reductionQuantity <= 0) {
        toast.error('Reduction quantity must be greater than 0');
        return;
      }
    }

    const selectedShades = Array.from(editingShades.values())
      .filter(item => item.reduction > 0)
      .map(item => ({
        shade: item.shade,
        quantity: item.reduction
      }));

    for (const shadeItem of selectedShades) {
      if (shadeItem.quantity > shadeItem.shade.quantity) {
        toast.error(`Cannot reduce more than available ${shadeItem.shade.colorName} (${shadeItem.shade.quantity})`);
        return;
      }
    }

    const newItem: ReductionItem = {
      stock: selectedStock,
      quantity: isFabric ? 0 : reductionQuantity,
      reason: 'Stock Reduction',
      selectedShades: selectedShades.length > 0 ? selectedShades : undefined
    };

    setReductionItems([...reductionItems, newItem]);
    setSelectedStock(null);
    setReductionQuantity(1);
    setEditingShades(new Map());
    toast.success('Reduction item added');
  };

  // Remove reduction item
  const removeReductionItem = (index: number) => {
    const updatedItems = reductionItems.filter((_, i) => i !== index);
    setReductionItems(updatedItems);
    toast.info('Reduction item removed');
  };

  // Process all reductions using the new completeUpdate API
  const processReductions = async () => {
    if (reductionItems.length === 0) {
      toast.error('No reduction items to process');
      return;
    }

    setLoading(true);
    try {
      for (const item of reductionItems) {
        const isFabric = isFabricProduct(item.stock);

        if (!isFabric && item.quantity > 0) {
          // Update main stock quantity for non-fabric products
          await api.patch(`/stock/${item.stock.id}/adjust`, {
            quantity: -item.quantity,
            reason: item.reason,
            username
          });
        }

        // For fabric products OR any product with shades, use completeUpdate
        if (isFabric || (item.selectedShades && item.selectedShades.length > 0)) {
          const updatedShades = item.stock.shades?.map(shade => {
            const reduction = item.selectedShades?.find(s => s.shade.id === shade.id);
            if (reduction) {
              return {
                ...shade,
                quantity: shade.quantity - reduction.quantity
              };
            }
            return shade;
          }) || [];

          // Prepare update payload for completeUpdate
          const updatePayload = {
            ...item.stock,
            quantity: isFabric ? item.stock.quantity : item.stock.quantity - item.quantity,
            shades: updatedShades,
            username
          };

          // Remove metadata fields that shouldn't be sent
          // delete updatePayload.createdAt;
          // delete updatePayload.updatedAt;

          // Use the completeUpdate endpoint
          await api.patch(`/stock/${item.stock.id}/complete`, updatePayload);
        } else if (!isFabric && item.quantity > 0) {
          // Non-fabric without shades, use adjust endpoint
          await api.patch(`/stock/${item.stock.id}/adjust`, {
            quantity: -item.quantity,
            reason: item.reason,
            username
          });
        }

        console.log(`Processed reduction for ${item.stock.product}`);
      }

      setReductionItems([]);
      await fetchStocks();

      toast.success('Stock reductions processed successfully!');
    } catch (error) {
      console.error('Error processing reductions:', error);
      toast.error('Failed to process stock reductions');
    } finally {
      setLoading(false);
    }
  };

  if (loading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageMeta title="Stock Reduction - Fashion House" description="Reduce stock quantities" />
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Reduction</h1>
          <p className="mt-1 text-gray-600">Manage inventory reductions with ease</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main Content */}
          <div className="flex-1 lg:w-2/3">
            {/* Image Search Section */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Smart Image Search</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <FiUpload className="w-4 h-4" />
                    Upload
                  </button>
                  <button
                    onClick={() => (showCamera ? captureFrameAndSearch() : startCamera())}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <FiCamera className="w-4 h-4" />
                    {showCamera ? 'Capture' : 'Camera'}
                  </button>
                </div>
              </div>

              {imageSearchLoading && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-blue-600 animate-progress-bar"></div>
                </div>
              )}

              {(imagePreview || showCamera) && (
                <div className="grid gap-3 mt-3 md:grid-cols-2">
                  {showCamera && (
                    <div className="relative overflow-hidden rounded">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="object-cover w-full h-40"
                      />
                    </div>
                  )}
                  {imagePreview && (
                    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded">
                      <img
                        src={imagePreview}
                        alt="Selected"
                        className="object-cover w-16 h-16 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {imageResults.length} match{imageResults.length !== 1 ? 'es' : ''} found
                        </p>
                        {imageResults.length > 0 && (
                          <button
                            onClick={clearImageResults}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Clear results
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            {/* Filters */}
            <div className="p-4 mb-4 bg-white rounded-lg shadow">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <FiSearch className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <select
                    className="w-full py-2 pl-3 pr-8 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {viewMode === 'grid' ? <FiGrid /> : <FiList />}
                    {viewMode === 'grid' ? 'Grid' : 'List'}
                  </button>
                  <button
                    onClick={fetchStocks}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                    title="Refresh"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-medium">Products ({filteredStocks.length})</h2>
                <div className="text-sm text-gray-500">
                  {reductionItems.length} items in reduction list
                </div>
              </div>

              {filteredStocks.length === 0 ? (
                <div className="p-8 text-center">
                  <FiPackage className="w-10 h-10 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-600">No products found</p>
                </div>
              ) : (
                <div className={`p-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}`}>
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.id}
                      className={`p-3 border rounded cursor-pointer transition-all hover:shadow ${selectedStock?.id === stock.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => handleStockSelect(stock)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {stock.imagePath && (
                            <img
                              className="object-cover w-12 h-12 rounded"
                              src={getImageUrl(stock.imagePath)}
                              alt={stock.product}
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{stock.product}</h3>
                            <p className="text-xs text-gray-500">{stock.stockId} • {stock.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1.5 py-0.5 text-xs rounded ${stock.quantity < 10
                                  ? 'bg-red-100 text-red-800'
                                  : stock.quantity < 50
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                {stock.quantity} units
                              </span>
                              <span className="text-xs font-medium">Ugx {stock.price}</span>
                            </div>
                            {stock.shades && stock.shades.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {stock.shades.slice(0, 3).map((shade, idx) => (
                                  <div
                                    key={idx}
                                    className="w-3 h-3 border rounded"
                                    style={{ backgroundColor: shade.color }}
                                    title={shade.colorName}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStockSelect(stock);
                          }}
                          className="p-1.5 text-blue-600 rounded hover:bg-blue-50"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            {/* Reduction Panel */}
            <div className="sticky space-y-4 top-6">
              {/* Selected Product */}
              {selectedStock && (
                <div className="p-4 bg-white rounded-lg shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">Reduce Stock</h3>
                      <p className="text-sm text-gray-600">{selectedStock.product}</p>
                    </div>
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>

                  {!isFabricProduct(selectedStock) && (
                    <div className="mb-3">
                      <label className="block mb-1 text-sm">Quantity to Reduce</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReductionQuantity(Math.max(1, reductionQuantity - 1))}
                          className="p-1.5 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedStock.quantity}
                          value={reductionQuantity}
                          onChange={(e) => setReductionQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 px-2 py-1.5 text-center border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => setReductionQuantity(Math.min(selectedStock.quantity, reductionQuantity + 1))}
                          className="p-1.5 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedStock.shades && selectedStock.shades.length > 0 && (
                    <div className="mb-3">
                      <label className="block mb-1 text-sm">
                        Reduce Shades {isFabricProduct(selectedStock) && '(Required)'}
                      </label>
                      <div className="space-y-2 overflow-y-auto max-h-32">
                        {Array.from(editingShades.values()).map((item) => (
                          <div key={item.shade.id} className="flex items-center justify-between p-2 text-sm rounded bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 border rounded"
                                style={{ backgroundColor: item.shade.color }}
                              />
                              <span>{item.shade.colorName}</span>
                              <span className="text-gray-500">({item.shade.quantity})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateShadeReduction(item.shade.id, Math.max(0, item.reduction - 1))}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center">{item.reduction}</span>
                              <button
                                onClick={() => updateShadeReduction(item.shade.id, Math.min(item.shade.quantity, item.reduction + 1))}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                <FiPlus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={addReductionItem}
                    disabled={
                      isFabricProduct(selectedStock)
                        ? !hasShadeReductions()
                        : reductionQuantity > selectedStock.quantity || reductionQuantity <= 0
                    }
                    className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Reduction List
                  </button>
                </div>
              )}

              {/* Reduction List */}
              <div className="p-4 bg-white rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Reduction List</h3>
                  {reductionItems.length > 0 && (
                    <button
                      onClick={() => setReductionItems([])}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {reductionItems.length === 0 ? (
                  <p className="py-6 text-center text-gray-500">No reduction items</p>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-60">
                    {reductionItems.map((item, index) => (
                      <div key={index} className="p-2 text-sm border border-gray-200 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.stock.product}</div>
                            {!isFabricProduct(item.stock) && item.quantity > 0 && (
                              <div className="text-gray-600">Reduce: {item.quantity} units</div>
                            )}
                            {item.selectedShades && item.selectedShades.length > 0 && (
                              <div className="mt-1 text-xs text-green-600">
                                Shades: {item.selectedShades.map(s => `-${s.quantity} ${s.shade.colorName}`).join(', ')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeReductionItem(index)}
                            className="p-1 text-red-600 rounded hover:bg-red-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reductionItems.length > 0 && (
                  <button
                    onClick={processReductions}
                    disabled={loading}
                    className="w-full py-2.5 mt-3 text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Process ${reductionItems.length} Item${reductionItems.length > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}