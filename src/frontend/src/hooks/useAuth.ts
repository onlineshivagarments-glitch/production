import { useInternetIdentity } from "./useInternetIdentity";

export function useAuth() {
  const { identity, login, clear, isInitializing } = useInternetIdentity();

  return {
    isAuthenticated: !!identity && !identity.getPrincipal().isAnonymous(),
    loading: isInitializing,
    login,
    logout: clear,
  };
}
