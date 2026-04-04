import { Router } from "express";
import {
  createFinancialRecordSchema,
  recordIdParamsSchema,
  recordsListQuerySchema,
  updateFinancialRecordSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validateRequest.js";
import {
  createFinancialRecord,
  deleteFinancialRecord,
  getFinancialRecord,
  getFinancialRecords,
  updateFinancialRecord,
} from "../controllers/financialRecordController.js";
import authenticate from "../middleware/authenticate.js";
import authorizeRoles from "../middleware/authorize.js";
import idempotencyMiddleware from "../middleware/idempotency.js";

const financialRecordRoutes = Router();

financialRecordRoutes.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Records
 *     description: Financial records CRUD endpoints
 */

/**
 * @swagger
 * /records:
 *   post:
 *     summary: Create a financial record
 *     description: Creates a new financial record. Requires Analyst or Admin role.
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Prevents duplicate POST requests when the same request is retried.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 1500.75
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: expense
 *               category:
 *                 type: string
 *                 example: Rent
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-04-01T00:00:00.000Z
 *               note:
 *                 type: string
 *                 example: April house rent
 *     responses:
 *       201:
 *         description: Financial record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Financial record created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     record:
 *                       $ref: '#/components/schemas/FinancialRecord'
 *       400:
 *         description: Validation error or missing idempotency header
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Idempotency conflict
 */
financialRecordRoutes.post(
  "/",
  authorizeRoles("Analyst", "Admin"),
  validateBody(createFinancialRecordSchema),
  idempotencyMiddleware,
  createFinancialRecord
);

/**
 * @swagger
 * /records:
 *   get:
 *     summary: List financial records
 *     description: Returns filtered and paginated records. Viewer sees own records, Admin sees all records.
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by record type.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Case-insensitive category filter.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Include records on or after this date.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Include records on or before this date.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 20
 *     responses:
 *       200:
 *         description: Financial records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Financial records fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FinancialRecord'
 *       400:
 *         description: Invalid query filters
 *       401:
 *         description: Unauthorized
 */
financialRecordRoutes.get("/", validateQuery(recordsListQuerySchema), getFinancialRecords);

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Get a single financial record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Financial record ID.
 *     responses:
 *       200:
 *         description: Financial record fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Financial record fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     record:
 *                       $ref: '#/components/schemas/FinancialRecord'
 *       400:
 *         description: Invalid record ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Financial record not found
 */
financialRecordRoutes.get("/:id", validateParams(recordIdParamsSchema), getFinancialRecord);

/**
 * @swagger
 * /records/{id}:
 *   put:
 *     summary: Update a financial record
 *     description: Updates an existing financial record. Requires Analyst or Admin role.
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Financial record ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 1800
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *                 example: Groceries
 *               date:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *                 example: Updated entry
 *     responses:
 *       200:
 *         description: Financial record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Financial record updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     record:
 *                       $ref: '#/components/schemas/FinancialRecord'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Financial record not found
 */
financialRecordRoutes.put(
  "/:id",
  authorizeRoles("Analyst", "Admin"),
  validateParams(recordIdParamsSchema),
  validateBody(updateFinancialRecordSchema),
  updateFinancialRecord
);

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     summary: Delete a financial record
 *     description: Soft deletes a financial record. Requires Admin role.
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Financial record ID.
 *     responses:
 *       200:
 *         description: Financial record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Financial record deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     record:
 *                       $ref: '#/components/schemas/FinancialRecord'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Financial record not found
 */
financialRecordRoutes.delete(
  "/:id",
  authorizeRoles("Admin"),
  validateParams(recordIdParamsSchema),
  deleteFinancialRecord
);

export default financialRecordRoutes;
