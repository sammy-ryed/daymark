import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { createApi } from "@project/api-client";
import type { AuthResponse, Profile } from "@project/contracts";
type SessionContextValue = {
  user: Profile | null;
  loading: boolean;
  message: string;
  api: ReturnType<typeof createApi>;
  authenticate: (v: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Profile) => void;
  retry: () => Promise<void>;
};
const Context = createContext<SessionContextValue | null>(null);
const tokenKey = "project-access-token";
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const api = useMemo(
    () =>
      createApi({
        baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api",
        getToken: () => SecureStore.getItemAsync(tokenKey),
        onUnauthorized: () => {
          void SecureStore.deleteItemAsync(tokenKey);
          setUser(null);
          setMessage("Your session has expired. Please sign in again.");
        },
      }),
    [],
  );
  async function retry() {
    setLoading(true);
    try {
      if (await SecureStore.getItemAsync(tokenKey)) {
        setUser(await api<Profile>("/auth/me"));
        setMessage("");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void retry();
  }, []);
  async function authenticate(result: AuthResponse) {
    if (result.accessToken && result.user) {
      await SecureStore.setItemAsync(tokenKey, result.accessToken);
      setUser(result.user);
      setMessage("");
    } else setMessage(result.message ?? "Confirm your email, then sign in.");
  }
  async function logout() {
    let error = "";
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      await SecureStore.deleteItemAsync(tokenKey);
      setUser(null);
      setMessage(
        error
          ? "Signed out on this device. Server logout could not be confirmed."
          : "",
      );
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        message,
        api,
        authenticate,
        logout,
        retry,
        updateProfile: setUser,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing session provider");
  return value;
}
