import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordData,
  ChangePasswordData,
} from "@/types/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  sessionExpiry: number | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<string>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  deleteAccount: (password: string) => Promise<void>;
  getToken: () => string | null;
  isTokenValid: () => boolean;
}

class AuthService {
  private static instance: AuthService;
  private queryClient: any;

  private constructor() {
    this.queryClient = useQueryClient();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login", credentials);

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        if (tokens.accessToken) {
          Cookies.set("accessToken", tokens.accessToken, {
            secure: true,
            sameSite: "lax",
            expires: tokens.accessTokenExpires / (24 * 60 * 60 * 1000),
          });
        }

        if (tokens.refreshToken) {
          Cookies.set("refreshToken", tokens.refreshToken, {
            secure: true,
            sameSite: "lax",
            expires: 7,
          });
        }

        api.setAuthToken(tokens.accessToken);

        await this.queryClient.setQueryData(["user"], user);
        await this.queryClient.invalidateQueries({ queryKey: ["user"] });

        logger.info("User logged in successfully", { userId: user.id });
        return response.data;
      }

      throw new Error("Login failed");
    } catch (error: any) {
      logger.error("Login error:", { error: error.message });
      throw error;
    }
  }

  public async register(
    credentials: RegisterCredentials,
  ): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(
        "/auth/register",
        credentials,
      );

      if (response.success && response.data) {
        logger.info("User registered successfully", {
          email: credentials.email,
        });
        return response.data;
      }

      throw new Error("Registration failed");
    } catch (error: any) {
      logger.error("Registration error:", { error: error.message });
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await api.post("/auth/logout", {
        refreshToken: Cookies.get("refreshToken"),
      });
    } catch (error: any) {
      logger.error("Logout error:", { error: error.message });
    } finally {
      this.clearAuth();
    }
  }

  public async logoutAll(): Promise<void> {
    try {
      await api.post("/auth/logout-all");
    } catch (error: any) {
      logger.error("Logout all error:", { error: error.message });
    } finally {
      this.clearAuth();
    }
  }

  public async refreshAccessToken(): Promise<string> {
    try {
      const refreshToken = Cookies.get("refreshToken");

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post<{ accessToken: string }>(
        "/auth/refresh",
        {
          refreshToken,
        },
      );

      if (response.success && response.data) {
        const { accessToken } = response.data;

        Cookies.set("accessToken", accessToken, {
          secure: true,
          sameSite: "lax",
          expires: 1 / 24,
        });

        api.setAuthToken(accessToken);
        return accessToken;
      }

      throw new Error("Failed to refresh token");
    } catch (error: any) {
      logger.error("Refresh token error:", { error: error.message });
      this.clearAuth();
      throw error;
    }
  }

  public async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<User>("/auth/me");

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.clearAuth();
      }
      return null;
    }
  }

  public async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await api.post("/auth/change-password", data);
      toast.success("Password changed successfully");
    } catch (error: any) {
      logger.error("Change password error:", { error: error.message });
      throw error;
    }
  }

  public async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      await api.post("/auth/reset-password", data);
      toast.success("Password reset successfully");
    } catch (error: any) {
      logger.error("Reset password error:", { error: error.message });
      throw error;
    }
  }

  public async forgotPassword(email: string): Promise<void> {
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("Password reset instructions sent to your email");
    } catch (error: any) {
      logger.error("Forgot password error:", { error: error.message });
      throw error;
    }
  }

  public async verifyEmail(token: string): Promise<void> {
    try {
      await api.get(`/auth/verify-email?token=${token}`);
      toast.success("Email verified successfully");
    } catch (error: any) {
      logger.error("Verify email error:", { error: error.message });
      throw error;
    }
  }

  public async resendVerification(email: string): Promise<void> {
    try {
      await api.post("/auth/resend-verification", { email });
      toast.success("Verification email sent");
    } catch (error: any) {
      logger.error("Resend verification error:", { error: error.message });
      throw error;
    }
  }

  public async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>("/auth/me", data);

      if (response.success && response.data) {
        await this.queryClient.setQueryData(["user"], response.data);
        toast.success("Profile updated successfully");
        return response.data;
      }

      throw new Error("Failed to update profile");
    } catch (error: any) {
      logger.error("Update profile error:", { error: error.message });
      throw error;
    }
  }

  public async deleteAccount(password: string): Promise<void> {
    try {
      await api.delete("/auth/me", { data: { password } });
      toast.success("Account deleted successfully");
      this.clearAuth();
    } catch (error: any) {
      logger.error("Delete account error:", { error: error.message });
      throw error;
    }
  }

  private clearAuth(): void {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    api.clearAuthToken();
    this.queryClient.setQueryData(["user"], null);
    this.queryClient.invalidateQueries({ queryKey: ["user"] });
  }

  public isTokenValid(): boolean {
    const token = Cookies.get("accessToken");
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  public getToken(): string | null {
    return Cookies.get("accessToken") || null;
  }

  public getRefreshToken(): string | null {
    return Cookies.get("refreshToken") || null;
  }
}

export function useAuth(): AuthContextValue {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const authService = AuthService.getInstance();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    token: null,
    refreshToken: null,
    sessionExpiry: null,
  });

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false,
    enabled: authService.isTokenValid(),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authService.login(credentials),
    onSuccess: (data) => {
      setState((prev) => ({
        ...prev,
        user: data.user,
        isAuthenticated: true,
        token: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        sessionExpiry: data.tokens.accessTokenExpires,
      }));
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (credentials: RegisterCredentials) =>
      authService.register(credentials),
    onSuccess: () => {
      toast.success(
        "Registration successful! Please check your email to verify your account.",
      );
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error("Logout failed");
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authService.logoutAll(),
    onSuccess: () => {
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error("Failed to logout from all devices");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordData) => authService.changePassword(data),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordData) => authService.resetPassword(data),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  });

  const resendVerificationMutation = useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => authService.updateProfile(data),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => authService.deleteAccount(password),
  });

  useEffect(() => {
    const token = authService.getToken();
    const refreshToken = authService.getRefreshToken();
    const isValid = authService.isTokenValid();

    setState((prev) => ({
      ...prev,
      token,
      refreshToken,
      isAuthenticated: isValid && !!user,
      isLoading: false,
    }));

    if (!isValid && token) {
      authService.refreshAccessToken().catch(() => {
        if (
          pathname?.startsWith("/dashboard") ||
          pathname?.startsWith("/tasks")
        ) {
          router.push("/login");
        }
      });
    }
  }, [user, pathname, router]);

  useEffect(() => {
    const handleTokenRefresh = async () => {
      const token = authService.getToken();
      if (token && !authService.isTokenValid()) {
        try {
          await authService.refreshAccessToken();
        } catch (error) {
          if (pathname?.startsWith("/dashboard")) {
            router.push("/login");
          }
        }
      }
    };

    const interval = setInterval(handleTokenRefresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await loginMutation.mutateAsync(credentials);
    },
    [loginMutation],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      await registerMutation.mutateAsync(credentials);
    },
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const logoutAll = useCallback(async () => {
    await logoutAllMutation.mutateAsync();
  }, [logoutAllMutation]);

  const refreshToken = useCallback(async () => {
    return await authService.refreshAccessToken();
  }, []);

  const changePassword = useCallback(
    async (data: ChangePasswordData) => {
      await changePasswordMutation.mutateAsync(data);
    },
    [changePasswordMutation],
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordData) => {
      await resetPasswordMutation.mutateAsync(data);
    },
    [resetPasswordMutation],
  );

  const forgotPassword = useCallback(
    async (email: string) => {
      await forgotPasswordMutation.mutateAsync(email);
    },
    [forgotPasswordMutation],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      await verifyEmailMutation.mutateAsync(token);
    },
    [verifyEmailMutation],
  );

  const resendVerification = useCallback(
    async (email: string) => {
      await resendVerificationMutation.mutateAsync(email);
    },
    [resendVerificationMutation],
  );

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      return await updateProfileMutation.mutateAsync(data);
    },
    [updateProfileMutation],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      await deleteAccountMutation.mutateAsync(password);
    },
    [deleteAccountMutation],
  );

  const getToken = useCallback(() => {
    return authService.getToken();
  }, []);

  const isTokenValid = useCallback(() => {
    return authService.isTokenValid();
  }, []);

  const value = useMemo(
    () => ({
      user: state.user || user || null,
      isLoading: state.isLoading || isLoading,
      isAuthenticated: state.isAuthenticated || !!user,
      token: state.token,
      refreshToken: state.refreshToken,
      sessionExpiry: state.sessionExpiry,
      login,
      register,
      logout,
      logoutAll,
      refreshToken: refreshToken,
      changePassword,
      resetPassword,
      forgotPassword,
      verifyEmail,
      resendVerification,
      updateProfile,
      deleteAccount,
      getToken,
      isTokenValid,
    }),
    [
      state,
      user,
      isLoading,
      login,
      register,
      logout,
      logoutAll,
      refreshToken,
      changePassword,
      resetPassword,
      forgotPassword,
      verifyEmail,
      resendVerification,
      updateProfile,
      deleteAccount,
      getToken,
      isTokenValid,
    ],
  );

  return value;
}

export default useAuth;
