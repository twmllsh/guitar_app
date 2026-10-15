// Simple Client-Side Auth helper for editor permissions

const AUTH_STORAGE_KEY = 'guitar_app_auth_session';

export function getExpectedCredentials() {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);
  
  const adminId = 
    (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__.ADMIN_ID) ||
    metaEnv.VITE_ADMIN_USER ||
    metaEnv.VITE_ADMIN_ID ||
    metaEnv.ADMIN_USER ||
    'admin';

  const adminPassword = 
    (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__.ADMIN_PASSWORD) ||
    metaEnv.VITE_ADMIN_PASSWORD ||
    metaEnv.ADMIN_PASSWORD ||
    'admin';

  return { adminId: String(adminId).trim(), adminPassword: String(adminPassword).trim() };
}

export function isAuthenticated(): boolean {
  try {
    const session = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!session) return false;
    const data = JSON.parse(session);
    return data && data.isLoggedIn === true;
  } catch {
    return false;
  }
}

export function login(userId: string, pass: string): boolean {
  const { adminId, adminPassword } = getExpectedCredentials();
  if (userId.trim() === adminId && pass.trim() === adminPassword) {
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          isLoggedIn: true,
          username: adminId,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Failed to save auth session', e);
    }
    return true;
  }
  return false;
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth session', e);
  }
}

export function getLoggedInUsername(): string | null {
  try {
    const session = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!session) return null;
    const data = JSON.parse(session);
    return data?.username || null;
  } catch {
    return null;
  }
}
