import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getToken, getUser } from '../../utils/auth';

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      // From localStorage
      tokenFromStorage: localStorage.getItem('token'),
      userFromStorage: localStorage.getItem('user'),
      
      // From cookies
      tokenFromCookies: Cookies.get('token'),
      userFromCookies: Cookies.get('user'),
      
      // From auth utils
      tokenFromUtils: getToken(),
      userFromUtils: getUser(),
      
      // All cookies
      allCookies: Cookies.get(),
      
      // Environment
      apiUrl: import.meta.env.VITE_API_URL,
    };
    
    setDebugInfo(info);
    console.log('Auth Debug Info:', info);
  }, []);

  return (
    <div className="w-full">
      <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-80 text-gray-800 dark:text-gray-200">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}