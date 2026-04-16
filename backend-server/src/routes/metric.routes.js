import express from 'express';
import { syncHealthData, getHealthMetrics } from '../controllers/metric.controller.js';
import { verifyToken, checkProfileComplete } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/v1/metrics
 * @desc    Đồng bộ dữ liệu sức khỏe từ Health Connect (Vét cạn nhịp tim, giấc ngủ stages)
 * @access  Private
 */
router.post('/', verifyToken, checkProfileComplete, syncHealthData);

/**
 * @route   GET /api/v1/metrics?range=day|week|month
 * @desc    Lấy dữ liệu sức khỏe theo khoảng thời gian để vẽ biểu đồ
 * @access  Private
 */
router.get('/', verifyToken, checkProfileComplete, getHealthMetrics);

export default router;