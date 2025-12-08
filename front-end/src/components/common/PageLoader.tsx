interface PageLoaderProps {
  label?: string;
  fullHeight?: boolean;
}

export default function PageLoader({ label = "Loading...", fullHeight = true }: PageLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullHeight ? "min-h-[300px]" : "py-10"
      }`}
    >
      <div className="w-12 h-12 border-4 border-gold-200 border-t-coffee-600 rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}

