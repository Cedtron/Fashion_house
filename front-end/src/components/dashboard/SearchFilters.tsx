import React from 'react';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

interface SearchFiltersProps {
  searchTerm: string;
  categoryFilter: string;
  sortOrder: 'asc' | 'desc';
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: () => void;
  onRefresh: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  categoryFilter,
  sortOrder,
  categories,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onRefresh
}) => {
  return (
    <div id="search-section" className="p-6 mb-6 bg-white shadow-lg rounded-xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="relative">
            <FiSearch className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Search by product name, stock ID, or category..."
              className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <select
            className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onSortChange}
            className="flex items-center justify-center flex-1 gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
            Sort
          </button>
          <button
            onClick={onRefresh}
            className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50"
            title="Refresh"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;