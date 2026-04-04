import path from "path";
import { fileURLToPath } from "url";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Financial Records API",
      version: "1.0.0",
      description: "RBAC-based financial management backend",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "67f1c7f7a2b1461e1e6f0d13",
            },
            name: {
              type: "string",
              example: "Aditya",
            },
            email: {
              type: "string",
              format: "email",
              example: "aditya@example.com",
            },
            role: {
              type: "string",
              enum: ["Viewer", "Analyst", "Admin"],
              example: "Viewer",
            },
            status: {
              type: "string",
              enum: ["active", "inactive"],
              example: "active",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2026-04-04T12:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2026-04-04T12:00:00.000Z",
            },
          },
        },
        FinancialRecord: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "67f1c9a9a2b1461e1e6f0d90",
            },
            amount: {
              type: "string",
              example: "2500.5",
              description: "Decimal128 serialized as string",
            },
            type: {
              type: "string",
              enum: ["income", "expense"],
              example: "expense",
            },
            category: {
              type: "string",
              example: "Rent",
            },
            date: {
              type: "string",
              format: "date-time",
              example: "2026-04-01T00:00:00.000Z",
            },
            note: {
              type: "string",
              example: "April rent",
            },
            createdBy: {
              type: "string",
              example: "67f1c7f7a2b1461e1e6f0d13",
            },
            deleted: {
              type: "boolean",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2026-04-04T12:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2026-04-04T12:00:00.000Z",
            },
          },
        },
        AuthRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "aditya@example.com",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 6,
              example: "Passw0rd!",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2YxYyIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwOTAwfQ.signature",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec, {
  explorer: true,
});
export { swaggerSpec };
