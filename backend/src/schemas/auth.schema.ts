import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email cannot exceed 100 characters")
    .transform((val) => val.toLowerCase().trim()),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores and hyphens",
    )
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .transform((val) => val.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .transform((val) => val.trim()),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "You must accept the terms and conditions"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(100, "New password cannot exceed 100 characters")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
      .regex(/[a-z]/, "New password must contain at least one lowercase letter")
      .regex(/[0-9]/, "New password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "New password must contain at least one special character",
      )
      .refine((val) => val !== "currentPassword", {
        message: "New password cannot be the same as current password",
      }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .optional()
    .transform((val) => val?.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .optional()
    .transform((val) => val?.trim()),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores and hyphens",
    )
    .optional()
    .transform((val) => val?.toLowerCase().trim()),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      language: z.string().min(2).max(10).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          sms: z.boolean().optional(),
          taskReminders: z.boolean().optional(),
          teamInvites: z.boolean().optional(),
          taskUpdates: z.boolean().optional(),
          comments: z.boolean().optional(),
        })
        .optional(),
      taskView: z.enum(["list", "board", "calendar", "timeline"]).optional(),
      sortOrder: z
        .enum(["createdAt", "updatedAt", "title", "priority", "dueDate"])
        .optional(),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      itemsPerPage: z.number().min(5).max(100).optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      startOfWeek: z.enum(["monday", "sunday", "saturday"]).optional(),
    })
    .optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account"),
  confirmDelete: z
    .boolean()
    .refine((val) => val === true, "You must confirm account deletion"),
});

export const validateTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const updateEmailSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const twoFactorSchema = z.object({
  code: z
    .string()
    .length(6, "2FA code must be 6 digits")
    .regex(/^\d+$/, "2FA code must contain only numbers"),
});

export const enableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().optional(),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z
    .string()
    .length(6, "2FA code must be 6 digits")
    .regex(/^\d+$/, "2FA code must contain only numbers"),
});

export const backupCodesSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const verifyBackupCodeSchema = z.object({
  code: z.string().min(8, "Invalid backup code format"),
});

export const oauthSchema = z.object({
  provider: z.enum(["google", "github", "facebook", "twitter"]),
  code: z.string().min(1, "Authorization code is required"),
  redirectUri: z.string().url("Invalid redirect URI").optional(),
});

export const socialLoginSchema = z.object({
  provider: z.enum(["google", "github", "facebook", "twitter"]),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
  profile: z.object({
    id: z.string().min(1, "Provider user ID is required"),
    email: z.string().email("Invalid email from provider"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

export const sessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  password: z.string().optional(),
});

export const apiKeySchema = z.object({
  name: z
    .string()
    .min(3, "API key name must be at least 3 characters")
    .max(50, "API key name cannot exceed 50 characters"),
  expiresIn: z.number().positive().optional(),
  permissions: z.array(z.string()).optional(),
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().min(1, "API key ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const magicLinkSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, "Magic link token is required"),
});

export const setPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const impersonateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z.string().max(500, "Reason cannot exceed 500 characters"),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

export const userBanSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(1000, "Reason cannot exceed 1000 characters"),
  duration: z.number().positive().optional(),
});

export const userUnbanSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const userRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["user", "admin", "moderator", "super_admin"]),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const auditLogSchema = z.object({
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

export const deviceSchema = z.object({
  deviceName: z
    .string()
    .min(1, "Device name is required")
    .max(50, "Device name cannot exceed 50 characters"),
  deviceType: z.enum(["mobile", "tablet", "desktop", "other"]),
  pushToken: z.string().optional(),
});

export const verifyDeviceSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const authSchemas = {
  register: registerSchema,
  login: loginSchema,
  refreshToken: refreshTokenSchema,
  logout: logoutSchema,
  verifyEmail: verifyEmailSchema,
  resendVerification: resendVerificationSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  updateProfile: updateProfileSchema,
  deleteAccount: deleteAccountSchema,
  validateToken: validateTokenSchema,
  updateEmail: updateEmailSchema,
  twoFactor: twoFactorSchema,
  enableTwoFactor: enableTwoFactorSchema,
  disableTwoFactor: disableTwoFactorSchema,
  backupCodes: backupCodesSchema,
  verifyBackupCode: verifyBackupCodeSchema,
  oauth: oauthSchema,
  socialLogin: socialLoginSchema,
  session: sessionSchema,
  revokeSession: revokeSessionSchema,
  apiKey: apiKeySchema,
  revokeApiKey: revokeApiKeySchema,
  magicLink: magicLinkSchema,
  verifyMagicLink: verifyMagicLinkSchema,
  setPassword: setPasswordSchema,
  impersonate: impersonateSchema,
  adminResetPassword: adminResetPasswordSchema,
  userBan: userBanSchema,
  userUnban: userUnbanSchema,
  userRole: userRoleSchema,
  auditLog: auditLogSchema,
  device: deviceSchema,
  verifyDevice: verifyDeviceSchema,
};

export default authSchemas;
