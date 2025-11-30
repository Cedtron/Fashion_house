export function getToken(){ return typeof window !== 'undefined' ? localStorage.getItem('token') : null }
export function getUser(){ try{ const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null }catch(e){ return null } }
export function isLoggedIn(){ return !!getToken() } export function getRole(){ const u=getUser(); return u?.role; }