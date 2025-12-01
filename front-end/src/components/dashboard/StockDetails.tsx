import React from 'react';
import { FiSave, FiX, FiMinus, FiPlus, FiEdit } from 'react-icons/fi';

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
}

interface StockDetailsProps {
  stock: Stock | null;
  editingStock: Stock | null;
  editingShades: Map<number, Shade>;
  onCancelEditing: () => void;
  onSaveChanges: () => void;
  onBackToList: () => void;
  onUpdateStockQuantity: (quantity: number) => void;
  onUpdateShadeQuantity: (shadeId: number, quantity: number) => void;
}

const StockDetails: React.FC<StockDetailsProps> = ({
  stock,
  editingStock,
  editingShades,
  onCancelEditing,
  onSaveChanges,
  onBackToList,
  onUpdateStockQuantity,
  onUpdateShadeQuantity
}) => {
  if (!stock) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingStock ? 'Adjust Stock' : 'Stock Details'} - {stock.stockId}
            </h2>
            <p className="text-gray-600">{stock.product}</p>
          </div>
          <div className="flex items-center gap-3">
            {editingStock && (
              <>
                <button
                  onClick={onCancelEditing}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={onSaveChanges}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <FiSave className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={onBackToList}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stock Information */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={editingStock?.product || stock.product}
                  readOnly
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={stock.category}
                  readOnly
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Current Quantity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    value={editingStock?.quantity ?? stock.quantity}
                    readOnly={!editingStock}
                    onChange={(e) => onUpdateStockQuantity(Number(e.target.value))}
                  />
                  {editingStock && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onUpdateStockQuantity((editingStock?.quantity || 0) - 1)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <FiMinus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateStockQuantity((editingStock?.quantity || 0) + 1)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Price
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={`$${stock.price.toFixed(2)}`}
                  readOnly
                />
              </div>
            </div>
          </div>
          
          {/* {stock.imagePath && (
            <div className="flex justify-center">
              <img
                src={stock.imagePath}
                alt={stock.product}
                className="object-cover w-48 h-48 border rounded-lg"
              />
            </div>
          )} */}
        </div>

        {/* Shades Section */}
        {stock.shades && stock.shades.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Color Shades</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(editingStock ? Array.from(editingShades.values()) : stock.shades).map((shade) => (
                <div
                  key={shade.id}
                  className="p-4 transition-shadow border border-gray-200 rounded-lg hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 border rounded"
                        style={{ backgroundColor: shade.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{shade.colorName}</div>
                        <div className="text-sm text-gray-500">{shade.color}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className={`w-full border rounded-lg px-3 py-2 ${
                            editingStock 
                              ? 'border-gray-300' 
                              : 'border-gray-200 bg-gray-50'
                          } ${shade.quantity === 0 ? 'bg-red-50 border-red-200' : ''}`}
                          value={shade.quantity}
                          readOnly={!editingStock}
                          disabled={shade.quantity === 0 && !editingStock}
                          onChange={(e) => onUpdateShadeQuantity(shade.id, Number(e.target.value))}
                        />
                        {editingStock && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => onUpdateShadeQuantity(shade.id, shade.quantity - 1)}
                              disabled={shade.quantity === 0}
                              className={`p-2 border rounded-lg ${
                                shade.quantity === 0
                                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onUpdateShadeQuantity(shade.id, shade.quantity + 1)}
                              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {shade.quantity === 0 && (
                        <p className="mt-1 text-xs text-red-600">Out of stock</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Length:</span>
                        <span className="ml-1 font-medium">{shade.length} {shade.lengthUnit}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit:</span>
                        <span className="ml-1 font-medium">{shade.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetails;