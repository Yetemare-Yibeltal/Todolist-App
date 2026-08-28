import request from "supertest";
import mongoose from "mongoose";
import { app } from "../src/app";
import { User } from "../src/models/User";
import { connectDB, closeDB } from "../src/config/database";
import { redisClient } from "../src/config/redis";
import { env } from "../src/config/env";
import { jwtService } from "../src/utils/jwt";
import { passwordService } from "../src/utils/password";

describe("Authentication API Tests", () => {
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;
  let verificationToken: string;
  let resetToken: string;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await redisClient.flushAll();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await redisClient.flushAll();
    await closeDB();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test@example.com",
        username: "testuser",
        password: "Test@123456",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.user.username).toBe("testuser");
      expect(response.body.data.tokens).toBeDefined();

      testUser = response.body.data.user;
      verificationToken = testUser.verificationToken;

      const dbUser = await User.findOne({ email: "test@example.com" });
      expect(dbUser).toBeDefined();
      expect(dbUser?.emailVerified).toBe(false);
      expect(dbUser?.status).toBe("pending_verification");
    });

    it("should reject duplicate email registration", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test@example.com",
        username: "testuser2",
        password: "Test@123456",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Email already registered");
    });

    it("should reject duplicate username registration", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test2@example.com",
        username: "testuser",
        password: "Test@123456",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Username already taken");
    });

    it("should reject weak password", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test3@example.com",
        username: "testuser3",
        password: "weak",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject invalid email", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "invalid-email",
        username: "testuser4",
        password: "Test@123456",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject missing required fields", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test4@example.com",
        password: "Test@123456",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject without accepting terms", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "test5@example.com",
        username: "testuser5",
        password: "Test@123456",
        firstName: "Test",
        lastName: "User",
        acceptTerms: false,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Test@123456",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe("test@example.com");

      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it("should reject login with invalid password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "WrongPassword123",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject login with non-existent email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: "Test@123456",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject login with unverified email", async () => {
      const unverifiedUser = await User.findOne({ email: "test@example.com" });
      expect(unverifiedUser?.emailVerified).toBe(false);

      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Test@123456",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("verify your email");
    });

    it("should lock account after multiple failed attempts", async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post("/api/v1/auth/login").send({
          email: "test@example.com",
          password: "WrongPassword",
        });
      }

      const response = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Test@123456",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("locked");
    });
  });

  describe("GET /api/v1/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/verify-email")
        .query({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Email verified");

      const user = await User.findOne({ email: "test@example.com" });
      expect(user?.emailVerified).toBe(true);
      expect(user?.status).toBe("active");
    });

    it("should reject invalid verification token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/verify-email")
        .query({ token: "invalid-token" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject expired verification token", async () => {
      const user = await User.findOne({ email: "test@example.com" });
      if (user) {
        user.verificationToken = "expired-token";
        user.verificationTokenExpires = new Date(Date.now() - 1000);
        await user.save();
      }

      const response = await request(app)
        .get("/api/v1/auth/verify-email")
        .query({ token: "expired-token" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh access token successfully", async () => {
      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should reject invalid refresh token", async () => {
      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: "invalid-refresh-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Test@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it("should change password successfully", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "Test@123456",
          newPassword: "NewTest@123456",
          confirmNewPassword: "NewTest@123456",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "NewTest@123456",
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    it("should reject wrong current password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "WrongPassword",
          newPassword: "NewTest@123456",
          confirmNewPassword: "NewTest@123456",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject without authentication", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .send({
          currentPassword: "Test@123456",
          newPassword: "NewTest@123456",
          confirmNewPassword: "NewTest@123456",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should send reset password email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "test@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        "Password reset instructions sent",
      );

      const user = await User.findOne({ email: "test@example.com" });
      expect(user?.resetPasswordToken).toBeDefined();

      if (user) {
        resetToken = user.resetPasswordToken;
      }
    });

    it("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "nonexistent@example.com",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken,
          password: "ResetTest@123456",
          confirmPassword: "ResetTest@123456",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    it("should reject invalid reset token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "invalid-token",
          password: "NewTest@123456",
          confirmPassword: "NewTest@123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject mismatched passwords", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: resetToken,
          password: "NewTest@123456",
          confirmPassword: "Different@123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it("should get current user profile", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
      expect(response.body.data.username).toBe("testuser");
      expect(response.body.data.firstName).toBe("Test");
      expect(response.body.data.lastName).toBe("User");
    });

    it("should reject without authentication", async () => {
      const response = await request(app).get("/api/v1/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    let authToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          refreshToken: refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Logged out");
    });

    it("should reject refresh token after logout", async () => {
      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: refreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/logout-all", () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it("should logout from all devices", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout-all")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Logged out from all devices");
    });

    it("should reject token after logout-all", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/auth/me", () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it("should update user profile", async () => {
      const response = await request(app)
        .put("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "Updated",
          lastName: "Name",
          preferences: {
            theme: "dark",
            language: "es",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe("Updated");
      expect(response.body.data.lastName).toBe("Name");
      expect(response.body.data.preferences.theme).toBe("dark");
      expect(response.body.data.preferences.language).toBe("es");
    });

    it("should reject duplicate username", async () => {
      await request(app).post("/api/v1/auth/register").send({
        email: "test2@example.com",
        username: "testuser2",
        password: "Test@123456",
        firstName: "Test2",
        lastName: "User2",
        acceptTerms: true,
      });

      const response = await request(app)
        .put("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          username: "testuser2",
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    it("should rate limit auth requests", async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app).post("/api/v1/auth/login").send({
            email: "test@example.com",
            password: "WrongPassword",
          }),
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe("Token Validation", () => {
    it("should validate valid token", async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      const token = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post("/api/v1/auth/validate-token")
        .send({
          token: token,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it("should reject invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/validate-token")
        .send({
          token: "invalid-token",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/v1/auth/me", () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "ResetTest@123456",
      });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it("should delete user account with correct password", async () => {
      const response = await request(app)
        .delete("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          password: "ResetTest@123456",
          confirmDelete: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Account deleted");

      const user = await User.findOne({ email: "test@example.com" });
      expect(user).toBeNull();
    });

    it("should reject account deletion with wrong password", async () => {
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test2@example.com",
        password: "Test@123456",
      });

      const token = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .delete("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .send({
          password: "WrongPassword",
          confirmDelete: true,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
