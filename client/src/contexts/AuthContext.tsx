import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

interface AuthContextType {
  authenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  username: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then(data => {
        setAuthenticated(data.authenticated);
        setUsername(data.username || null);
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (user: string, pass: string) => {
    const data = await authApi.login(user, pass);
    setAuthenticated(true);
    setUsername(data.username);
  };

  const logout = async () => {
    await authApi.logout();
    setAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ authenticated, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
