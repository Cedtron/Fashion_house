import React from 'react';
import { FiSave, FiX, FiMinus, FiPlus, FiEdit, FiArrowLeft } from 'react-icons/fi';

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
  onUpdateShadeQuantity,
}) => {
  if (!stock) return null;

  return (
    <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {editingStock ? '✏️ Adjust Stock' : '📦 Stock Details'} – {stock.stockId}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">{stock.product}</p>
        </div>

        <div className="flex items-center gap-3">
          {editingStock && (
            <>
              <button
                onClick={onCancelEditing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
              >
                <FiX className="w-4 h-4" /> Cancel
              </button>

              <button
                onClick={onSaveChanges}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              >
                <FiSave className="w-4 h-4" /> Save
              </button>
            </>
          )}

          <button
            onClick={onBackToList}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6">

        {/* STOCK INFO */}
        <div className="grid grid-cols-1 gap-6 mb-10 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Product Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
                  value={stock.category}
                  readOnly
                />
              </div>

              {/* QUANTITY */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Quantity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
                    value={editingStock?.quantity ?? stock.quantity}
                    readOnly={!editingStock}
                    onChange={(e) => onUpdateStockQuantity(Number(e.target.value))}
                  />

                  {editingStock && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onUpdateStockQuantity((editingStock?.quantity || 0) - 1)}
                        className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
                      >
                        <FiMinus />
                      </button>
                      <button
                        onClick={() => onUpdateStockQuantity((editingStock?.quantity || 0) + 1)}
                        className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
                      >
                        <FiPlus />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PRICE */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Price</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
                  value={`$${stock.price.toFixed(2)}`}
                  readOnly
                />
              </div>

            </div>
          </div>

          {/* IMAGE */}
          {stock.imagePath && (
            <div className="flex justify-center items-start">
              <img
                src={stock.imagePath}
                alt={stock.product}
                className="w-48 h-48 rounded-xl border border-gray-200 object-cover shadow-md"
              />
            </div>
          )}
        </div>

        {/* SHADES */}
        {stock.shades?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Color Shades</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(editingStock ? Array.from(editingShades.values()) : stock.shades).map((shade) => (
                <div
                  key={shade.id}
                  className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition"
                >
                  {/* HEADER */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-9 h-9 rounded-lg border border-gray-300"
                      style={{ backgroundColor: shade.color }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{shade.colorName}</p>
                      <p className="text-sm text-gray-500">{shade.color}</p>
                    </div>
                  </div>

                  {/* QUANTITY */}
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Quantity
                  </label>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      className={`w-full px-3 py-2 rounded-lg border shadow-sm ${
                        editingStock ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                      } ${shade.quantity === 0 ? 'bg-red-50 border-red-300' : ''}`}
                      value={shade.quantity}
                      readOnly={!editingStock}
                      onChange={(e) =>
                        onUpdateShadeQuantity(shade.id, Number(e.target.value))
                      }
                    />

                    {editingStock && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onUpdateShadeQuantity(shade.id, shade.quantity - 1)}
                          disabled={shade.quantity === 0}
                          className={`p-2 border rounded-lg ${
                            shade.quantity === 0
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 bg-white hover:bg-gray-100'
                          }`}
                        >
                          <FiMinus />
                        </button>

                        <button
                          onClick={() => onUpdateShadeQuantity(shade.id, shade.quantity + 1)}
                          className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    )}
                  </div>

                  {shade.quantity === 0 && (
                    <p className="text-xs text-red-600 font-medium">Out of stock</p>
                  )}

                  {/* EXTRA INFO */}
                  <div className="grid grid-cols-2 mt-4 text-sm gap-2">
                    <p>
                      <span className="text-gray-600">Length:</span>
                      <span className="font-medium ml-1">
                        {shade.length} {shade.lengthUnit}
                      </span>
                    </p>

                    <p>
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-medium ml-1">{shade.unit}</span>
                    </p>
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
