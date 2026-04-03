import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken, setEasyAuthEnabled } from '../services/api';

interface AuthUser {
  userId: string;
  userDetails: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/.auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          const principal = data[0];
          const claims = principal.user_claims || [];
          const nameClaim = claims.find((c: { typ: string; val: string }) =>
            c.typ === 'name' || c.typ === 'preferred_username'
          );
          setUser({
            userId: principal.user_id || '',
            userDetails: nameClaim?.val || principal.user_id || 'User',
          });
          
          // Forward auth token for API calls
          const token = principal.access_token || principal.id_token;
          if (token) {
            setAuthToken(token);
            setEasyAuthEnabled(true);
          }
        }
      })
      .catch(() => {
        // Not authenticated or Easy Auth not enabled
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    window.location.href = '/.auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
