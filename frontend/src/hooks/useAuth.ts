import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { authApi, ApiError } from "@/lib/api";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } = options ?? {};

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      queryClient.setQueryData(["auth", "me"], null);
      navigate(redirectPath);
    },
  });

  const switchRoleMutation = useMutation({
    mutationFn: authApi.switchRole,
    onSuccess: async (res) => {
      queryClient.setQueryData(["auth", "me"], { user: res.user });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: authApi.updateAvatar,
    onSuccess: async (res) => {
      queryClient.setQueryData(["auth", "me"], { user: res.user });
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);
  const switchRole = useCallback(
    (role: "customer" | "provider") => switchRoleMutation.mutate(role),
    [switchRoleMutation],
  );
  const updateAvatar = useCallback(
    (avatarUrl: string) => updateAvatarMutation.mutate(avatarUrl),
    [updateAvatarMutation],
  );

  const user = data?.user ?? null;
  const isUnauthenticated = !isLoading && (error instanceof ApiError ? error.status === 401 : !user);

  useEffect(() => {
    if (redirectOnUnauthenticated && isUnauthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isUnauthenticated, navigate, redirectPath]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      switchRole,
      isSwitchingRole: switchRoleMutation.isPending,
      switchRoleError: switchRoleMutation.error as ApiError | null,
      updateAvatar,
      isUpdatingAvatar: updateAvatarMutation.isPending,
      refresh: refetch,
    }),
    [
      user,
      isLoading,
      logoutMutation.isPending,
      error,
      logout,
      switchRole,
      switchRoleMutation.isPending,
      switchRoleMutation.error,
      updateAvatar,
      updateAvatarMutation.isPending,
      refetch,
    ],
  );
}
