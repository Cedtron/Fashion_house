import React from "react";

export default function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-[380px] shadow-xl">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Fashion House Support
        </h2>

        <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Need help with your Stock Management System?
          <br />
          Our developer is available for support, updates, and custom features.
        </p>

        <div className="mt-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            👨‍💻 <strong>Cedodeveloper</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            📧 Email: <span className="font-medium">cedodeveloper@gmail.com</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
