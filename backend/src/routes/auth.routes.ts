import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { rateLimiter } from "../middleware/rateLimiter.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from "../schemas/auth.schema";

const router = Router();

router.post(
  "/register",
  rateLimiter.authLimiter,
  validate(registerSchema),
  authController.register,
);

router.post(
  "/login",
  rateLimiter.authLimiter,
  validate(loginSchema),
  authController.login,
);

router.post(
  "/refresh",
  rateLimiter.strictLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken,
);

router.post("/logout", authMiddleware.requireAuth(), authController.logout);

router.post(
  "/logout-all",
  authMiddleware.requireAuth(),
  authController.logoutAll,
);

router.get(
  "/verify-email",
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

router.post(
  "/resend-verification",
  rateLimiter.authLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
);

router.post(
  "/forgot-password",
  rateLimiter.authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  rateLimiter.authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

router.post(
  "/change-password",
  authMiddleware.requireAuth(),
  validate(changePasswordSchema),
  authController.changePassword,
);

router.get("/me", authMiddleware.requireAuth(), authController.getCurrentUser);

router.put(
  "/me",
  authMiddleware.requireAuth(),
  validate(updateProfileSchema),
  authController.updateProfile,
);

router.delete(
  "/me",
  authMiddleware.requireAuth(),
  validate(deleteAccountSchema),
  authController.deleteAccount,
);

router.get(
  "/sessions",
  authMiddleware.requireAuth(),
  authController.getUserSessions,
);

router.post(
  "/validate-token",
  rateLimiter.apiLimiter,
  authController.validateToken,
);

router.get(
  "/login-history",
  authMiddleware.requireAuth(),
  authController.getLoginHistory,
);

export default router;
