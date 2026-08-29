import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";
import {
  ValidationError as ClassValidationError,
  validate as classValidate,
  ValidatorOptions,
} from "class-validator";
import { plainToClass } from "class-transformer";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { performance } from "perf_hooks";

interface ValidationOptions {
  source?: "body" | "query" | "params" | "headers";
  skipMissing?: boolean;
  skipNull?: boolean;
  skipUndefined?: boolean;
  groups?: string[];
  stopAtFirstError?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  forbidUnknownValues?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
  type?: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

class ValidationMiddleware {
  private static instance: ValidationMiddleware;

  private constructor() {}

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  private formatZodError(error: ZodError): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const issue of error.issues) {
      const path = issue.path.join(".");

      errors.push({
        field: path,
        message: issue.message,
        value: undefined,
        type: issue.code,
      });
    }

    return errors;
  }

  private formatClassValidatorError(
    errors: ClassValidationError[],
  ): ValidationError[] {
    const formattedErrors: ValidationError[] = [];

    for (const error of errors) {
      if (error.children && error.children.length > 0) {
        formattedErrors.push({
          field: error.property,
          message: "Invalid nested object",
          value: error.value,
          children: this.formatClassValidatorError(error.children),
        });
      } else {
        const constraints = error.constraints || {};

        for (const [type, message] of Object.entries(constraints)) {
          formattedErrors.push({
            field: error.property,
            message,
            value: error.value,
            type,
          });
        }
      }
    }

    return formattedErrors;
  }

  private getValueFromSource(req: Request, source: string): any {
    switch (source) {
      case "body":
        return req.body;
      case "query":
        return req.query;
      case "params":
        return req.params;
      case "headers":
        return req.headers;
      default:
        return req.body;
    }
  }

  private sanitizeData(data: any, options: ValidationOptions): any {
    if (options.skipNull) {
      const sanitized = { ...data };

      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] === null) {
          delete sanitized[key];
        }
      }

      return sanitized;
    }

    if (options.skipUndefined) {
      const sanitized = { ...data };

      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] === undefined) {
          delete sanitized[key];
        }
      }

      return sanitized;
    }

    if (options.skipMissing) {
      const sanitized = { ...data };

      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] === null || sanitized[key] === undefined) {
          delete sanitized[key];
        }
      }

      return sanitized;
    }

    return data;
  }

  private async validateWithClassValidator(
    data: any,
    schema: any,
    options: ValidationOptions,
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const instance = plainToClass(schema, data);

    const validatorOptions: ValidatorOptions = {
      skipMissingProperties: options.skipMissing || false,
      skipNullProperties: options.skipNull || false,
      skipUndefinedProperties: options.skipUndefined || false,
      groups: options.groups || [],
      stopAtFirstError: options.stopAtFirstError || false,
      whitelist: options.whitelist || false,
      forbidNonWhitelisted: options.forbidNonWhitelisted || false,
      forbidUnknownValues: options.forbidUnknownValues || false,
    };

    const errors = await classValidate(instance, validatorOptions);

    if (errors.length > 0) {
      return {
        valid: false,
        errors: this.formatClassValidatorError(errors),
      };
    }

    return { valid: true, errors: [] };
  }

  private validateWithZod(
    data: any,
    schema: ZodSchema,
  ): {
    valid: boolean;
    errors: ValidationError[];
    validatedData: any;
  } {
    try {
      const validatedData = schema.parse(data);

      return {
        valid: true,
        errors: [],
        validatedData,
      };
    } catch (error: any) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: this.formatZodError(error),
          validatedData: null,
        };
      }

      throw error;
    }
  }

  private async validateData(
    data: any,
    schema: ZodSchema | any,
    options: ValidationOptions,
  ): Promise<{
    valid: boolean;
    errors: ValidationError[];
    validatedData: any;
  }> {
    const sanitizedData = this.sanitizeData(data, options);

    if (schema && typeof schema.parse === "function") {
      return this.validateWithZod(sanitizedData, schema);
    } else if (
      typeof schema === "function" &&
      schema.prototype &&
      schema.prototype.constructor.name !== "Function"
    ) {
      const result = await this.validateWithClassValidator(
        sanitizedData,
        schema,
        options,
      );

      return {
        ...result,
        validatedData: result.valid ? sanitizedData : null,
      };
    } else {
      throw new Error(
        "Invalid schema provided. Must be Zod schema or class-validator class.",
      );
    }
  }

  public validate(schema: ZodSchema | any, options: ValidationOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const source = options.source || "body";
        const data = this.getValueFromSource(req, source);

        if (!data) {
          throw new ApiError(400, "No data provided for validation");
        }

        const { valid, errors, validatedData } = await this.validateData(
          data,
          schema,
          options,
        );

        if (!valid) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Validation failed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            errors,
            source,
          });

          throw new ApiError(400, "Validation failed", true, errors);
        }

        if (validatedData) {
          req.body = validatedData;
        }

        const duration = (performance.now() - startTime) / 1000;

        if (duration > 1) {
          logger.debug("Validation completed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Validation middleware error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
          });

          next(new ApiError(400, "Validation error occurred"));
        }
      }
    };
  }

  public validateParam(
    paramName: string,
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const paramValue = req.params[paramName];

        if (!paramValue) {
          throw new ApiError(400, `Parameter '${paramName}' is required`);
        }

        const { valid, errors, validatedData } = await this.validateData(
          { [paramName]: paramValue },
          schema,
          options,
        );

        if (!valid) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Parameter validation failed:", {
            duration: `${duration.toFixed(2)}s`,
            paramName,
            paramValue,
            errors,
          });

          throw new ApiError(400, `Invalid parameter '${paramName}'`, true, errors);
        }

        if (validatedData) {
          req.params[paramName] = validatedData[paramName];
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Parameter validation error:", {
            error: error.message,
            paramName,
            path: req.path,
          });

          next(new ApiError(400, `Invalid parameter '${paramName}'`));
        }
      }
    };
  }

  public validateQuery(
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return this.validate(schema, { ...options, source: "query" });
  }

  public validateParams(
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return this.validate(schema, { ...options, source: "params" });
  }

  public validateHeaders(
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return this.validate(schema, { ...options, source: "headers" });
  }

  public async validateCustom(
    data: any,
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ): Promise<{
    valid: boolean;
    errors: ValidationError[];
    validatedData: any;
  }> {
    return this.validateData(data, schema, options);
  }

  public createValidator(
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return this.validate(schema, options);
  }

  public validateArray(
    schema: ZodSchema | any,
    options: ValidationOptions = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const data = req.body;

        if (!Array.isArray(data)) {
          throw new ApiError(400, "Expected an array for validation");
        }

        const errors: ValidationError[] = [];
        const validatedData: any[] = [];

        for (let index = 0; index < data.length; index++) {
          const item = data[index];
          const result = await this.validateData(item, schema, options);

          if (!result.valid) {
            errors.push({
              field: `[${index}]`,
              message: "Validation failed for array item",
              children: result.errors,
            });
          } else {
            validatedData.push(result.validatedData);
          }
        }

        if (errors.length > 0) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Array validation failed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            errors,
          });

          throw new ApiError(
            400,
            "Validation failed for array items",
            true,
            errors,
          );
        }

        req.body = validatedData;

        const duration = (performance.now() - startTime) / 1000;

        if (duration > 1) {
          logger.debug("Array validation completed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            count: validatedData.length,
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Array validation error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
          });

          next(new ApiError(400, "Array validation failed"));
        }
      }
    };
  }

  public validateNested(
    schemaMap: Record<string, ZodSchema | any>,
    options: ValidationOptions = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const data = req.body;
        const errors: ValidationError[] = [];
        const validatedData: Record<string, any> = {};

        for (const [key, schema] of Object.entries(schemaMap)) {
          const value = data[key];

          if (value === undefined && options.skipMissing) {
            continue;
          }

          const result = await this.validateData(value, schema, options);

          if (!result.valid) {
            errors.push({
              field: key,
              message: "Validation failed for nested field",
              children: result.errors,
            });
          } else {
            validatedData[key] = result.validatedData;
          }
        }

        if (errors.length > 0) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Nested validation failed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            errors,
          });

          throw new ApiError(
            400,
            "Validation failed for nested fields",
            true,
            errors,
          );
        }

        req.body = { ...data, ...validatedData };

        const duration = (performance.now() - startTime) / 1000;

        if (duration > 1) {
          logger.debug("Nested validation completed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            fields: Object.keys(validatedData),
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Nested validation error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
          });

          next(new ApiError(400, "Nested validation failed"));
        }
      }
    };
  }

  public validateCustomRules(
    rules: Array<{
      field: string;
      validator: (value: any) => boolean;
      message: string;
    }>,
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const data = req.body;
        const errors: ValidationError[] = [];

        for (const rule of rules) {
          const value = data[rule.field];

          if (value === undefined || value === null) {
            continue;
          }

          if (!rule.validator(value)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              value,
            });
          }
        }

        if (errors.length > 0) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Custom validation failed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            errors,
          });

          throw new ApiError(400, "Custom validation failed", true, errors);
        }

        const duration = (performance.now() - startTime) / 1000;

        if (duration > 1) {
          logger.debug("Custom validation completed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Custom validation error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
          });

          next(new ApiError(400, "Custom validation failed"));
        }
      }
    };
  }

  public validateWithTransform<T>(
    schema: ZodSchema | any,
    transform: (data: any) => T,
    options: ValidationOptions = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const source = options.source || "body";
        const data = this.getValueFromSource(req, source);

        if (!data) {
          throw new ApiError(400, "No data provided for validation");
        }

        const { valid, errors, validatedData } = await this.validateData(
          data,
          schema,
          options,
        );

        if (!valid) {
          const duration = (performance.now() - startTime) / 1000;

          logger.warn("Validation with transform failed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            errors,
          });

          throw new ApiError(400, "Validation failed", true, errors);
        }

        if (validatedData) {
          const transformedData = transform(validatedData);
          req.body = transformedData;
        }

        const duration = (performance.now() - startTime) / 1000;

        if (duration > 1) {
          logger.debug("Validation with transform completed:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Validation with transform error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
          });

          next(new ApiError(400, "Validation with transform failed"));
        }
      }
    };
  }
}

export const validationMiddleware = ValidationMiddleware.getInstance();

export const validate =
  validationMiddleware.validate.bind(validationMiddleware);

export const validateParam =
  validationMiddleware.validateParam.bind(validationMiddleware);

export const validateQuery =
  validationMiddleware.validateQuery.bind(validationMiddleware);

export const validateParams =
  validationMiddleware.validateParams.bind(validationMiddleware);

export const validateHeaders =
  validationMiddleware.validateHeaders.bind(validationMiddleware);

export const validateArray =
  validationMiddleware.validateArray.bind(validationMiddleware);

export const validateNested =
  validationMiddleware.validateNested.bind(validationMiddleware);

export const validateCustomRules =
  validationMiddleware.validateCustomRules.bind(validationMiddleware);

export const validateWithTransform =
  validationMiddleware.validateWithTransform.bind(validationMiddleware);

export default validationMiddleware;
