import React, { useState } from 'react';
import { FiPackage, FiRefreshCw, FiEye, FiEdit, FiImage } from 'react-icons/fi';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import api from '../../utils/axios';

interface Stock {
  id: number;
  stockId: string;
  product: string;
  category: string;
  quantity: number;
  cost: number;
  price: number;
  imagePath?: string | null;
  shades: Array<{
    color: string;
    colorName: string;
  }>;
}

interface RecentStockProps {
  stocks: Stock[];
  sortOrder: 'asc' | 'desc';
  onSortChange: () => void;
  onRefresh: () => void;
  onViewDetails: (stock: Stock) => void;
  onEditStock: (stock: Stock) => void;
}

const RecentStock: React.FC<RecentStockProps> = ({
  stocks,
  sortOrder,
  onSortChange,
  onRefresh,
  onViewDetails,
  onEditStock,
}) => {
  // Dashboard pagination state
  const [page, setPage] = useState(1);

  // Only 8 items per dashboard page
  const itemsPerPage = 8;

  // Dashboard max = 2 pages only
  const maxPages = 2;

  const totalPages = Math.min(
    Math.ceil(stocks.length / itemsPerPage),
    maxPages
  );

  const paginatedStocks = stocks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="mb-8 bg-white border border-gray-200 shadow-lg rounded-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FiPackage className="w-5 h-5 text-primary" />
            Recent Stock
          </h2>

          <div className="flex gap-3">
            <button
              onClick={onSortChange}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
              Quantity
            </button>

            <button
              onClick={onRefresh}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {paginatedStocks.length === 0 ? (
          <div className="py-12 text-center">
            <FiPackage className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No stocks found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedStocks.map((stock) => (
              <div
                key={stock.id}
                className="p-4 transition-all border border-gray-200 shadow-sm bg-gray-50 rounded-xl hover:shadow-md"
              >
                {/* Image + Title */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {stock.imagePath ? (
                      <img                        
                        src={stock.imagePath.startsWith('http') ? stock.imagePath : `${api.defaults.baseURL}${stock.imagePath}`} 
                        alt={stock.product}
                        className="object-cover rounded-lg w-14 h-14"
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-gray-200 rounded-lg w-14 h-14">
                        <FiImage className="w-6 h-6 text-gray-500" />
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-gray-900">{stock.product}</h3>
                      <p className="text-xs text-gray-500">{stock.stockId}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      stock.quantity < 10
                        ? 'bg-red-100 text-red-700'
                        : stock.quantity < 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {stock.quantity}
                  </span>
                </div>

                {/* Category + Price */}
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="px-2 py-1 text-gray-700 bg-gray-200 rounded-md">
                    {stock.category}
                  </span>
                  <span className="font-medium text-gray-700">Ugx {stock.price}</span>
                </div>

                {/* Shades */}
                <div className="flex items-center gap-2 mb-3">
                  {stock.shades.slice(0, 3).map((shade, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 border rounded shadow-sm"
                      style={{ backgroundColor: shade.color }}
                      title={shade.colorName}
                    />
                  ))}
                  {stock.shades.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{stock.shades.length - 3}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onViewDetails(stock)}
                    className="flex items-center justify-center flex-1 gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <FiEye className="w-4 h-4" /> View
                  </button>

                  {/* <button
                    onClick={() => onEditStock(stock)}
                    className="flex items-center justify-center flex-1 gap-1 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <FiEdit className="w-4 h-4" /> Adjust
                  </button> */}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Pagination (MAX 2 pages) */}
        {stocks.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className={`px-4 py-2 rounded-lg border ${
                page <= 1
                  ? 'text-gray-400 border-gray-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>

            <span className="text-sm font-medium text-gray-600">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className={`px-4 py-2 rounded-lg border ${
                page >= totalPages
                  ? 'text-gray-400 border-gray-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentStock;
