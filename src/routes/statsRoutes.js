import { Router } from "express";
import {
  getCategoryStats,
  getMonthlyStats,
  getSummaryStats,
} from "../controllers/statsController.js";
import authenticate from "../middleware/authenticate.js";
import authorizeRoles from "../middleware/authorize.js";
import { statsQuerySchema, validateQuery } from "../middleware/validateRequest.js";

const statsRoutes = Router();

statsRoutes.use(authenticate);
statsRoutes.use(authorizeRoles("Viewer", "Analyst", "Admin"));
statsRoutes.use(validateQuery(statsQuerySchema));

/**
 * @swagger
 * tags:
 *   - name: Stats
 *     description: Dashboard analytics endpoints
 */

/**
 * @swagger
 * /stats/summary:
 *   get:
 *     summary: Get summary statistics
 *     description: Returns total income, total expense, and net balance.
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary stats fetched successfully
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
 *                   example: Summary stats fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIncome:
 *                       type: string
 *                       example: "25000"
 *                     totalExpense:
 *                       type: string
 *                       example: "12000"
 *                     netBalance:
 *                       type: string
 *                       example: "13000"
 *       401:
 *         description: Unauthorized
 */
statsRoutes.get("/summary", getSummaryStats);

/**
 * @swagger
 * /stats/category:
 *   get:
 *     summary: Get category-wise expense statistics
 *     description: Returns grouped expense totals by category.
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category stats fetched successfully
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
 *                   example: Category stats fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: Groceries
 *                       totalExpense:
 *                         type: string
 *                         example: "4000"
 *                       count:
 *                         type: integer
 *                         example: 12
 *       401:
 *         description: Unauthorized
 */
statsRoutes.get("/category", getCategoryStats);

/**
 * @swagger
 * /stats/monthly:
 *   get:
 *     summary: Get monthly statistics
 *     description: Returns monthly income, expense, and net balance trends.
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly stats fetched successfully
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
 *                   example: Monthly stats fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                         example: 2026
 *                       month:
 *                         type: integer
 *                         example: 4
 *                       totalIncome:
 *                         type: string
 *                         example: "25000"
 *                       totalExpense:
 *                         type: string
 *                         example: "12000"
 *                       netBalance:
 *                         type: string
 *                         example: "13000"
 *       401:
 *         description: Unauthorized
 */
statsRoutes.get("/monthly", getMonthlyStats);

export default statsRoutes;
