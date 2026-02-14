import { getToken, getUser } from './auth';
import Cookies from 'js-cookie';

export async function verifyToken() {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

export function logout() {
  // Clear from both localStorage and cookies
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  Cookies.remove('token');
  Cookies.remove('user');
  window.location.href = '/signin';
}
