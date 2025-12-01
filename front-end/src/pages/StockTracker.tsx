import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../utils/axios';
import PageMeta from '../components/common/PageMeta';
import Cookies from 'js-cookie';
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
  
} from 'react-icons/fi';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { AiOutlineScan } from "react-icons/ai";
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [reductionItems, setReductionItems] = useState<ReductionItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [reductionQuantity, setReductionQuantity] = useState(1);
  const [username, setUsername] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [editingShades, setEditingShades] = useState<Map<number, {shade: Shade, reduction: number}>>(new Map());

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
      toast.success('Stocks loaded successfully');
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

  // Filter stocks based on search term and category
  useEffect(() => {
    let filtered = stocks;
    
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

    // Sort by quantity
    filtered = [...filtered].sort((a, b) => {
      return sortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
    });

    setFilteredStocks(filtered);
  }, [stocks, searchTerm, categoryFilter, sortOrder]);

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

  // Simulate barcode scanning
  const simulateScan = () => {
    if (stocks.length > 0) {
      const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
      handleStockSelect(randomStock);
      toast.success(`Scanned: ${randomStock.product}`);
    }
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
    
    // Initialize shade reductions
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
      // For fabric products, only allow shade reductions
      if (!hasShadeReductions()) {
        toast.error('Please reduce at least one color shade');
        return;
      }
    } else {
      // For non-fabric products, validate main quantity
      if (reductionQuantity > selectedStock.quantity) {
        toast.error(`Cannot reduce more than available stock (${selectedStock.quantity})`);
        return;
      }

      if (reductionQuantity <= 0) {
        toast.error('Reduction quantity must be greater than 0');
        return;
      }
    }

    // Validate shade reductions
    const selectedShades = Array.from(editingShades.values())
      .filter(item => item.reduction > 0)
      .map(item => ({
        shade: item.shade,
        quantity: item.reduction
      }));

    // Check if shade reductions exceed available quantities
    for (const shadeItem of selectedShades) {
      if (shadeItem.quantity > shadeItem.shade.quantity) {
        toast.error(`Cannot reduce more than available ${shadeItem.shade.colorName} (${shadeItem.shade.quantity})`);
        return;
      }
    }

    const newItem: ReductionItem = {
      stock: selectedStock,
      quantity: isFabric ? 0 : reductionQuantity, // For fabric, main quantity is 0
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

  // Update reduction quantity
  const updateReductionQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const item = reductionItems[index];
    if (newQuantity > item.stock.quantity) {
      toast.error(`Cannot reduce more than available stock (${item.stock.quantity})`);
      return;
    }

    const updatedItems = [...reductionItems];
    updatedItems[index].quantity = newQuantity;
    setReductionItems(updatedItems);
  };

  // Process all reductions
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

        // Update shades quantities if shades are selected
        if (item.selectedShades) {
          for (const shadeItem of item.selectedShades) {
            await api.patch(`/shades/${shadeItem.shade.id}`, {
              quantity: shadeItem.shade.quantity - shadeItem.quantity,
              username
            });
          }
        }

        console.log(`Reduced ${item.stock.product} by ${item.quantity} units`);
      }

      // Clear reduction items
      setReductionItems([]);
      // Refresh stocks
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
      
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Reduction</h1>
              <p className="mt-2 text-gray-600">
                Reduce stock quantities and manage inventory
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <FiPackage className="w-4 h-4" />
                <span className="text-sm font-medium">{stocks.length} Products</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Products List */}
          <div className="lg:col-span-2">
            {/* Search and Filters */}
            <div className="p-6 mb-6 bg-white shadow-lg rounded-xl">
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <FiSearch className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <input
                    type="text"
                    placeholder="Search by product name, stock ID, or category..."
                    className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={showCamera ? stopCamera : startCamera}
                  className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-colors ${
                    showCamera
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <FiCamera className="w-5 h-5" />
                  {showCamera ? 'Stop Camera' : 'Scan'}
                </button>
              </div>

              {/* Camera Preview */}
              {showCamera && (
                <div className="mb-4">
                  <div className="relative overflow-hidden bg-black rounded-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="object-cover w-full h-48"
                    />
                    <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-lg pointer-events-none" />
                    <button
                      onClick={simulateScan}
                      className="absolute flex items-center gap-2 px-4 py-2 text-white transform -translate-x-1/2 bg-blue-600 rounded-lg bottom-4 left-1/2 hover:bg-blue-700"
                    >
                      <AiOutlineScan className="w-4 h-4" />
                      Simulate Scan
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <select
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center justify-center flex-1 gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
                    Sort
                  </button>
                  <button
                    onClick={fetchStocks}
                    className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50"
                    title="Refresh"
                  >
                    <FiRefreshCw />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white shadow-lg rounded-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FiPackage className="w-5 h-5 text-blue-600" />
                  All Products ({filteredStocks.length})
                </h2>
              </div>
              <div className="p-6">
                {filteredStocks.length === 0 ? (
                  <div className="py-12 text-center">
                    <FiPackage className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredStocks.map((stock) => (
                      <div
                        key={stock.id}
                        className={`p-4 bg-gray-50 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                          selectedStock?.id === stock.id
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleStockSelect(stock)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {stock.imagePath && (
                              <img
                                className="object-cover w-12 h-12 rounded-lg"
                                
                                 src={stock.imagePath.startsWith('http') ? stock.imagePath : `${api.defaults.baseURL}${stock.imagePath}`}
                                alt={stock.product}
                              />
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900">{stock.product}</h3>
                              <p className="text-sm text-gray-500">{stock.stockId}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            stock.quantity < 10 
                              ? 'bg-red-100 text-red-800' 
                              : stock.quantity < 50 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {stock.quantity}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-200 rounded">{stock.category}</span>
                          <span>${stock.price}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {stock.shades?.slice(0, 3).map((shade, index) => (
                            <div
                              key={index}
                              className="w-4 h-4 border rounded shadow-sm"
                              style={{ backgroundColor: shade.color }}
                              title={shade.colorName}
                            />
                          ))}
                          {stock.shades?.length > 3 && (
                            <span className="text-xs text-gray-500">+{stock.shades.length - 3}</span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStockSelect(stock);
                          }}
                          className="flex items-center justify-center w-full gap-1 px-3 py-2 text-sm text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <FiMinus className="w-3 h-3" />
                          Reduce Stock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Reduction Panel */}
          <div className="space-y-6">
            {/* Selected Product for Reduction */}
            {selectedStock && (
              <div className="p-6 bg-white shadow-lg rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold">Reduce Stock</h2>
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-4">
                  {selectedStock.imagePath && (
                    <img
                      className="object-cover w-16 h-16 rounded-lg"
                      src={selectedStock.imagePath}
                      alt={selectedStock.product}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedStock.product}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedStock.stockId} • {selectedStock.category}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${
                      selectedStock.quantity < 10 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedStock.quantity} available
                    </p>
                    {isFabricProduct(selectedStock) && (
                      <p className="mt-1 text-xs text-blue-600">Fabric Product - Reduce by color shades</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Main Quantity Reduction - Only for non-fabric products */}
                  {!isFabricProduct(selectedStock) && (
                    <div>
                      <label className="block mb-2 text-sm font-medium">Quantity to Reduce</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReductionQuantity(Math.max(1, reductionQuantity - 1))}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedStock.quantity}
                          value={reductionQuantity}
                          onChange={(e) => setReductionQuantity(parseInt(e.target.value) || 1)}
                          className="flex-1 px-3 py-2 text-center border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={() => setReductionQuantity(Math.min(selectedStock.quantity, reductionQuantity + 1))}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        Max: {selectedStock.quantity} units
                      </p>
                    </div>
                  )}

                  {/* Shades Reduction Section - Show for all products with shades */}
                  {selectedStock.shades && selectedStock.shades.length > 0 && (
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Reduce Color Shades {isFabricProduct(selectedStock) && '(Required)'}
                      </label>
                      <div className="space-y-2 overflow-y-auto max-h-40">
                        {Array.from(editingShades.values()).map((item) => (
                          <div
                            key={item.shade.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                          >
                            <div
                              className="w-6 h-6 border rounded"
                              style={{ backgroundColor: item.shade.color }}
                              title={item.shade.colorName}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.shade.colorName}</div>
                              <div className="text-xs text-gray-600">
                                {item.shade.quantity} available
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateShadeReduction(item.shade.id, Math.max(0, item.reduction - 1))}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-sm font-medium text-center">
                                {item.reduction}
                              </span>
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
                      {isFabricProduct(selectedStock) && getTotalShadeReduction() > 0 && (
                        <p className="mt-2 text-xs text-green-600">
                          Total shade reduction: {getTotalShadeReduction()} units
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={addReductionItem}
                    disabled={
                      isFabricProduct(selectedStock) 
                        ? !hasShadeReductions() // For fabric, require shade reductions
                        : reductionQuantity > selectedStock.quantity || reductionQuantity <= 0 // For non-fabric, validate main quantity
                    }
                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                      (isFabricProduct(selectedStock) && !hasShadeReductions()) ||
                      (!isFabricProduct(selectedStock) && (reductionQuantity > selectedStock.quantity || reductionQuantity <= 0))
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <FiSave className="w-4 h-4" />
                    Add to Reduction List
                  </button>
                </div>
              </div>
            )}

            {/* Reduction List */}
            <div className="p-6 bg-white shadow-lg rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <FiShoppingCart className="w-5 h-5" />
                  Reduction List ({reductionItems.length})
                </h2>
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
                <div className="py-8 text-center">
                  <FiPackage className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-600">
                    No reduction items
                  </p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-96">
                  {reductionItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{item.stock.product}</div>
                          <div className="text-sm text-gray-600">
                            {!isFabricProduct(item.stock) && item.quantity > 0 && (
                              <>Reduce: {item.quantity} units</>
                            )}
                            {isFabricProduct(item.stock) && (
                              <>Fabric - Reduce by shades</>
                            )}
                          </div>
                          {item.selectedShades && item.selectedShades.length > 0 && (
                            <div className="mt-1 text-xs text-green-600">
                              Shades: {item.selectedShades.map(s => `${s.shade.colorName} (-${s.quantity})`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isFabricProduct(item.stock) && (
                            <>
                              <button
                                onClick={() => updateReductionQuantity(index, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className={`p-1 rounded ${
                                  item.quantity <= 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="w-8 font-medium text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateReductionQuantity(index, item.quantity + 1)}
                                disabled={item.quantity >= item.stock.quantity}
                                className={`p-1 rounded ${
                                  item.quantity >= item.stock.quantity
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'hover:bg-gray-200'
                                }`}
                              >
                                <FiPlus className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => removeReductionItem(index)}
                            className="p-1 text-red-600 rounded hover:bg-red-50"
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reductionItems.length > 0 && (
                <button
                  onClick={processReductions}
                  disabled={loading}
                  className={`w-full mt-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Process Reductions ({reductionItems.length} items)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}