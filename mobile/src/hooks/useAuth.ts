import { useQuery } from '@tanstack/react-query';
import { queryFn } from '@/lib/api';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}