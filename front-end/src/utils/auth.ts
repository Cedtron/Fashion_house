import Cookies from 'js-cookie';

export function getToken() { 
  if (typeof window === 'undefined') return null;
  
  // Check localStorage first, then cookies
  const tokenFromStorage = localStorage.getItem('token');
  if (tokenFromStorage) return tokenFromStorage;
  
  // Check cookies
  return Cookies.get('token') || null;
}

export function getUser() { 
  if (typeof window === 'undefined') return null;
  
  try {
    // Check localStorage first
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) return JSON.parse(userFromStorage);
    
    // Then check cookies
    const userFromCookies = Cookies.get('user');
    return userFromCookies ? JSON.parse(userFromCookies) : null;
  } catch (e) { 
    console.error('Error parsing user data:', e);
    return null;
  } 
}

export function isLoggedIn() { 
  return !!getToken();
} 

export function getRole() { 
  const u = getUser(); 
  return u?.role; 
}