import express from 'express';
import apiRoutes from './routes/index.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

// ===========================================
// CẤU HÌNH MIDDLEWARE
// ===========================================

// Tăng giới hạn payload để xử lý dữ liệu đồng bộ lớn (lỗi PayloadTooLargeError)
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware để debug: Xem dữ liệu React Native gửi lên có gì
app.use((req, res, next) => {
    if (req.originalUrl.includes('/sync') || req.method === 'POST') {
        const recordCount = req.body?.metrics?.length || 0;
        console.log(`\n--- [DEBUG API] ${req.method} ${req.originalUrl} ---`);
        console.log(`📦 Nhận ${recordCount} bản ghi từ App`);
        if (recordCount > 0) {
            console.log(`🔹 Bản ghi đầu tiên:`, req.body.metrics[0]);
        }
    }
    next();
});

// ===========================================
// ROUTES
// ===========================================

app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'HealthGuard API is running live!',
        timestamp: new Date().toISOString()
    });
});

// ===========================================
// KHỞI CHẠY SERVER
// ===========================================

const PORT = process.env.PORT || 3000;

setupSwagger(app);

app.listen(PORT, () => {
    console.log(`\n🚀 HealthGuard Backend v1.0`);
    console.log(`📡 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📄 Swagger Docs: http://localhost:${PORT}/api-docs`);
    console.log(`----------------------------------------------`);
});

export default app;