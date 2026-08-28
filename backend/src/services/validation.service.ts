import { ZodError, ZodType } from "zod";
import authSchemas from "../schemas/auth.schema";
import taskSchemas from "../schemas/task.schema";

class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }

    return ValidationService.instance;
  }

  public async validate<T>(
    schema: ZodType<T>,
    data: unknown,
    message = "Validation failed",
  ): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        const validationError = new Error(message);

        Object.assign(validationError, {
          statusCode: 400,
          status: 400,
          details,
          isValidationError: true,
        });

        throw validationError;
      }

      throw error;
    }
  }

  public async validateRegistration(data: unknown) {
    return this.validate(
      authSchemas.register,
      data,
      "Registration validation failed",
    );
  }

  public async validateLogin(data: unknown) {
    return this.validate(
      authSchemas.login,
      data,
      "Login validation failed",
    );
  }

  public async validateTaskCreation(data: unknown) {
    return this.validate(
      taskSchemas.create,
      data,
      "Task creation validation failed",
    );
  }

  public async validateTaskUpdate(data: unknown) {
    return this.validate(
      taskSchemas.update,
      data,
      "Task update validation failed",
    );
  }
}

export const validationService = ValidationService.getInstance();

export default validationService;
