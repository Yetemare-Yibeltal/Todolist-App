import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

interface FileCheck {
  path: string;
  exists: boolean;
  size: number;
  minSize: number;
  hasContent: boolean;
  lines: number;
  errors: string[];
}

class BackendVerifier {
  private baseDir: string;
  private files: FileCheck[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.baseDir = path.join(__dirname, "..");
  }

  private checkFile(filePath: string, minLines: number = 50): FileCheck {
    const fullPath = path.join(this.baseDir, filePath);
    const check: FileCheck = {
      path: filePath,
      exists: false,
      size: 0,
      minSize: minLines * 30,
      hasContent: false,
      lines: 0,
      errors: [],
    };

    try {
      if (fs.existsSync(fullPath)) {
        check.exists = true;
        const stats = fs.statSync(fullPath);
        check.size = stats.size;

        const content = fs.readFileSync(fullPath, "utf-8");
        check.hasContent = content.trim().length > 0;
        check.lines = content.split("\n").length;

        if (check.lines < minLines) {
          check.errors.push(
            `File has only ${check.lines} lines, expected at least ${minLines}`,
          );
        }

        if (check.size < 1000) {
          check.errors.push(`File is too small (${check.size} bytes)`);
        }

        // Check for common placeholder patterns
        const placeholders = [
          "TODO",
          "FIXME",
          "placeholder",
          "incomplete",
          "example",
          "// TODO",
          "/* TODO",
          "not implemented",
        ];

        for (const placeholder of placeholders) {
          if (content.toLowerCase().includes(placeholder.toLowerCase())) {
            check.errors.push(`Contains placeholder: "${placeholder}"`);
          }
        }
      } else {
        check.errors.push("File does not exist");
      }
    } catch (error: any) {
      check.errors.push(`Error reading file: ${error.message}`);
    }

    return check;
  }

  private verifyAllFiles(): void {
    console.log(chalk.blue("\n📁 Verifying all backend files...\n"));

    const requiredFiles = [
      // Root files
      { path: "package.json", minLines: 30 },
      { path: "tsconfig.json", minLines: 20 },
      { path: "tsconfig.build.json", minLines: 15 },
      { path: ".env", minLines: 30 },
      { path: ".env.example", minLines: 30 },

      // Config files
      { path: "src/config/env.ts", minLines: 100 },
      { path: "src/config/database.ts", minLines: 150 },
      { path: "src/config/redis.ts", minLines: 150 },

      // Utility files
      { path: "src/utils/logger.ts", minLines: 150 },
      { path: "src/utils/apiError.ts", minLines: 100 },
      { path: "src/utils/jwt.ts", minLines: 150 },
      { path: "src/utils/password.ts", minLines: 150 },

      // Model files
      { path: "src/models/User.ts", minLines: 200 },
      { path: "src/models/Task.ts", minLines: 300 },

      // Service files
      { path: "src/services/auth.service.ts", minLines: 300 },
      { path: "src/services/task.service.ts", minLines: 400 },
      { path: "src/services/email.service.ts", minLines: 250 },
      { path: "src/services/notification.service.ts", minLines: 300 },

      // Middleware files
      { path: "src/middleware/auth.middleware.ts", minLines: 250 },
      { path: "src/middleware/error.middleware.ts", minLines: 200 },
      { path: "src/middleware/validation.middleware.ts", minLines: 200 },
      { path: "src/middleware/rateLimiter.middleware.ts", minLines: 200 },

      // Controller files
      { path: "src/controllers/auth.controller.ts", minLines: 200 },
      { path: "src/controllers/task.controller.ts", minLines: 250 },

      // Route files
      { path: "src/routes/auth.routes.ts", minLines: 150 },
      { path: "src/routes/task.routes.ts", minLines: 200 },
      { path: "src/routes/health.routes.ts", minLines: 150 },

      // Schema files
      { path: "src/schemas/auth.schema.ts", minLines: 150 },
      { path: "src/schemas/task.schema.ts", minLines: 150 },

      // Type files
      { path: "src/types/auth.ts", minLines: 150 },
      { path: "src/types/task.ts", minLines: 200 },

      // Main files
      { path: "src/app.ts", minLines: 150 },
      { path: "src/server.ts", minLines: 150 },

      // Test files
      { path: "tests/auth.test.ts", minLines: 300 },
      { path: "tests/tasks.test.ts", minLines: 400 },
    ];

    for (const file of requiredFiles) {
      const check = this.checkFile(file.path, file.minLines);
      this.files.push(check);

      const status = check.exists ? chalk.green("✅") : chalk.red("❌");
      const sizeKB = (check.size / 1024).toFixed(1);
      const lineInfo = check.exists ? `${check.lines} lines` : "MISSING";

      console.log(
        `${status} ${file.path.padEnd(50)} ${lineInfo.padEnd(15)} ${sizeKB}KB`,
      );

      if (check.errors.length > 0) {
        for (const error of check.errors) {
          console.log(chalk.yellow(`   ⚠️  ${error}`));
          this.errors.push(`${file.path}: ${error}`);
        }
      }
    }
  }

  private verifyDependencies(): void {
    console.log(chalk.blue("\n📦 Verifying dependencies...\n"));

    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.baseDir, "package.json"), "utf-8"),
      );

      const requiredDeps = [
        "express",
        "mongoose",
        "redis",
        "jsonwebtoken",
        "bcryptjs",
        "zod",
        "dotenv",
        "cors",
        "helmet",
        "compression",
        "morgan",
        "winston",
        "nodemailer",
        "socket.io",
        "bull",
        "class-validator",
        "class-transformer",
        "reflect-metadata",
        "express-rate-limit",
        "rate-limit-redis",
        "connect-redis",
        "express-session",
        "cookie-parser",
        "multer",
        "uuid",
        "crypto-js",
        "joi",
        "swagger-jsdoc",
        "swagger-ui-express",
      ];

      const devDeps = [
        "typescript",
        "@types/node",
        "@types/express",
        "@types/mongoose",
        "@types/redis",
        "@types/jsonwebtoken",
        "@types/bcryptjs",
        "@types/cors",
        "@types/helmet",
        "@types/compression",
        "@types/morgan",
        "@types/nodemailer",
        "@types/socket.io",
        "@types/bull",
        "@types/express-rate-limit",
        "@types/multer",
        "@types/uuid",
        "ts-node",
        "nodemon",
        "jest",
        "@types/jest",
        "ts-jest",
        "supertest",
        "@types/supertest",
        "eslint",
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
        "prettier",
      ];

      const missingDeps: string[] = [];
      const missingDevDeps: string[] = [];

      for (const dep of requiredDeps) {
        if (!packageJson.dependencies?.[dep]) {
          missingDeps.push(dep);
        }
      }

      for (const dep of devDeps) {
        if (!packageJson.devDependencies?.[dep]) {
          missingDevDeps.push(dep);
        }
      }

      if (missingDeps.length === 0 && missingDevDeps.length === 0) {
        console.log(chalk.green("✅ All dependencies are present"));
      } else {
        if (missingDeps.length > 0) {
          console.log(chalk.yellow("⚠️  Missing dependencies:"));
          for (const dep of missingDeps) {
            console.log(`   - ${dep}`);
          }
        }
        if (missingDevDeps.length > 0) {
          console.log(chalk.yellow("⚠️  Missing devDependencies:"));
          for (const dep of missingDevDeps) {
            console.log(`   - ${dep}`);
          }
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error reading package.json: ${error.message}`));
      this.errors.push(`package.json error: ${error.message}`);
    }
  }

  private verifyScripts(): void {
    console.log(chalk.blue("\n🔧 Verifying npm scripts...\n"));

    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.baseDir, "package.json"), "utf-8"),
      );

      const requiredScripts = [
        "dev",
        "build",
        "start",
        "test",
        "lint",
        "format",
      ];

      const scripts = packageJson.scripts || {};
      const missingScripts: string[] = [];

      for (const script of requiredScripts) {
        if (!scripts[script]) {
          missingScripts.push(script);
        }
      }

      if (missingScripts.length === 0) {
        console.log(chalk.green("✅ All required scripts are present"));
      } else {
        console.log(chalk.yellow("⚠️  Missing scripts:"));
        for (const script of missingScripts) {
          console.log(`   - ${script}`);
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error reading scripts: ${error.message}`));
    }
  }

  private verifyEnvironment(): void {
    console.log(chalk.blue("\n🌍 Verifying environment variables...\n"));

    try {
      const envContent = fs.readFileSync(
        path.join(this.baseDir, ".env"),
        "utf-8",
      );
      const envLines = envContent
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"));

      const requiredVars = [
        "NODE_ENV",
        "PORT",
        "MONGODB_URI",
        "REDIS_URL",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "EMAIL_HOST",
        "EMAIL_USER",
        "EMAIL_PASS",
        "FRONTEND_URL",
      ];

      const presentVars = new Set();
      for (const line of envLines) {
        const [key] = line.split("=");
        if (key) presentVars.add(key.trim());
      }

      const missingVars = requiredVars.filter((v) => !presentVars.has(v));

      if (missingVars.length === 0) {
        console.log(
          chalk.green("✅ All required environment variables are present"),
        );
      } else {
        console.log(chalk.yellow("⚠️  Missing environment variables:"));
        for (const varName of missingVars) {
          console.log(`   - ${varName}`);
        }
        this.warnings.push(`Missing env vars: ${missingVars.join(", ")}`);
      }

      // Check for default values that should be changed
      const dangerousDefaults = [
        { key: "JWT_SECRET", value: "your-super-secret-jwt-key" },
        { key: "JWT_REFRESH_SECRET", value: "your-refresh-secret" },
        { key: "SESSION_SECRET", value: "your-session-secret" },
      ];

      for (const { key, value } of dangerousDefaults) {
        if (envContent.includes(`${key}=${value}`)) {
          console.log(
            chalk.yellow(
              `⚠️  ${key} still has default value - change this for production!`,
            ),
          );
          this.warnings.push(`${key} has default value`);
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error reading .env file: ${error.message}`));
      this.errors.push(`.env error: ${error.message}`);
    }
  }

  private verifyDirectories(): void {
    console.log(chalk.blue("\n📁 Verifying directory structure...\n"));

    const requiredDirs = [
      "src/config",
      "src/controllers",
      "src/middleware",
      "src/models",
      "src/routes",
      "src/services",
      "src/schemas",
      "src/types",
      "src/utils",
      "src/sockets",
      "src/queues",
      "src/jobs",
      "src/events",
      "src/repositories",
      "src/factories",
      "src/adapters",
      "src/helpers",
      "src/hooks",
      "src/plugins",
      "src/seeders",
      "src/migrations",
      "src/validators",
      "src/decorators",
      "src/interfaces",
      "src/constants",
      "src/enums",
      "src/errors",
      "tests",
      "scripts",
      "uploads",
      "logs",
      "backups",
    ];

    const missingDirs: string[] = [];

    for (const dir of requiredDirs) {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        missingDirs.push(dir);
        console.log(chalk.yellow(`⚠️  Missing directory: ${dir}`));
      }
    }

    if (missingDirs.length === 0) {
      console.log(chalk.green("✅ All required directories are present"));
    } else {
      console.log(
        chalk.yellow(`⚠️  ${missingDirs.length} directories missing`),
      );
    }
  }

  private verifyBuild(): void {
    console.log(chalk.blue("\n🔨 Verifying TypeScript build...\n"));

    try {
      execSync("npx tsc --noEmit", {
        cwd: this.baseDir,
        stdio: "pipe",
        encoding: "utf-8",
      });
      console.log(chalk.green("✅ TypeScript compilation successful"));
    } catch (error: any) {
      console.log(chalk.red("❌ TypeScript compilation failed:"));
      console.log(error.stdout || error.stderr || error.message);
      this.errors.push("TypeScript compilation failed");
    }
  }

  private verifyImports(): void {
    console.log(chalk.blue("\n📦 Verifying imports...\n"));

    try {
      const tsConfigPath = path.join(this.baseDir, "tsconfig.json");
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf-8"));

      const paths = tsConfig.compilerOptions?.paths || {};
      const aliasCount = Object.keys(paths).length;

      if (aliasCount > 0) {
        console.log(chalk.green(`✅ Found ${aliasCount} path aliases:`));
        for (const [alias, mapping] of Object.entries(paths)) {
          console.log(`   - ${alias} -> ${mapping}`);
        }
      } else {
        console.log(chalk.yellow("⚠️  No path aliases configured"));
        this.warnings.push("No path aliases configured");
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error reading tsconfig: ${error.message}`));
    }
  }

  private generateReport(): void {
    console.log(chalk.blue("\n📊 Verification Report\n"));
    console.log("=".repeat(60));

    const totalFiles = this.files.length;
    const existingFiles = this.files.filter((f) => f.exists).length;
    const filesWithErrors = this.files.filter(
      (f) => f.errors.length > 0,
    ).length;
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;

    console.log(`\n📁 Total files checked: ${totalFiles}`);
    console.log(`✅ Files present: ${existingFiles}`);
    console.log(`❌ Missing files: ${totalFiles - existingFiles}`);
    console.log(`⚠️  Files with errors: ${filesWithErrors}`);
    console.log(`🐛 Total errors: ${totalErrors}`);
    console.log(`⚠️  Total warnings: ${totalWarnings}`);

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log(
        chalk.green("\n🎉 All checks passed! The backend is ready to run.\n"),
      );
    } else if (totalErrors === 0) {
      console.log(
        chalk.yellow(
          "\n⚠️  All checks passed with warnings. Review warnings above.\n",
        ),
      );
    } else {
      console.log(
        chalk.red("\n❌ Some checks failed. Please fix the errors above.\n"),
      );
    }

    if (this.errors.length > 0) {
      console.log(chalk.red("\nError Summary:"));
      for (const error of this.errors) {
        console.log(`  ❌ ${error}`);
      }
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow("\nWarning Summary:"));
      for (const warning of this.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
    }

    console.log("\n" + "=".repeat(60));
  }

  public async verify(): Promise<void> {
    console.log(chalk.cyan("\n🚀 Starting Backend Verification\n"));

    this.verifyAllFiles();
    this.verifyDependencies();
    this.verifyScripts();
    this.verifyEnvironment();
    this.verifyDirectories();
    this.verifyImports();
    this.verifyBuild();

    this.generateReport();

    if (this.errors.length === 0 && this.files.every((f) => f.exists)) {
      console.log(chalk.green("\n✅ To start the backend, run:\n"));
      console.log(chalk.cyan("  npm install"));
      console.log(chalk.cyan("  npm run dev"));
      console.log();
    } else {
      console.log(
        chalk.red(
          "\n❌ Please fix the errors above before running the backend.\n",
        ),
      );
    }
  }
}

const verifier = new BackendVerifier();
verifier.verify().catch(console.error);
