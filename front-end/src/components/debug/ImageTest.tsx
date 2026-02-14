import { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

export default function ImageTest() {
  const [testPath, setTestPath] = useState('/uploads/stock/test.jpg');
  const [showTest, setShowTest] = useState(false);

  const testUrl = getImageUrl(testPath);

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">🖼️ Image URL Test</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <label className="block font-medium">Test Image Path:</label>
          <input 
            type="text" 
            value={testPath}
            onChange={(e) => setTestPath(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="/uploads/stock/image.jpg"
          />
        </div>
        
        <div>
          <label className="block font-medium">Generated URL:</label>
          <div className="bg-gray-100 p-2 rounded text-xs break-all">
            {testUrl}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowTest(!showTest)}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
          >
            {showTest ? 'Hide' : 'Test'} Image
          </button>
          
          <button 
            onClick={() => window.open(testUrl || '', '_blank')}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded"
          >
            Open URL
          </button>
        </div>
        
        {showTest && testUrl && (
          <div className="mt-2">
            <img 
              src={testUrl} 
              alt="Test" 
              className="w-full h-20 object-cover border rounded"
              onLoad={() => console.log('✅ Image loaded successfully:', testUrl)}
              onError={() => console.error('❌ Image failed to load:', testUrl)}
            />
          </div>
        )}
      </div>
      
      <button 
        onClick={() => setShowTest(false)}
        className="absolute top-1 right-2 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
  );
}