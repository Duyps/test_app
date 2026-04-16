import prisma from '../lib/prisma.js';

/**
 * 1. ĐỒNG BỘ DỮ LIỆU THỰC TỪ APP (Health Connect)
 * Cập nhật: Logic mới bóc tách dữ liệu đã gộp từ App
 */
export const syncHealthData = async (req, res) => {
    try {
        const { data } = req.body; 
        const currentUserId = req.user.user_id;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ status: "error", message: "Dữ liệu không hợp lệ." });
        }

        // Mapping lại dữ liệu để khớp với các cột trong Database
        const dataToInsert = data.map((item) => {
            return {
                user_id: currentUserId,
                record_time: new Date(item.record_time), // Chuyển chuỗi ISO sang đối tượng Date
                heart_rate: item.heart_rate ? Math.round(item.heart_rate) : null,
                steps: item.steps ? Math.round(item.steps) : null,
                blood_oxygen: item.blood_oxygen ? parseFloat(item.blood_oxygen) : null,
                calories: item.calories ? parseFloat(item.calories) : null,
                distance: item.distance ? parseFloat(item.distance) : null,
                sleep_duration: item.sleep_duration ? Math.round(item.sleep_duration) : null,
                // raw_data: item // Duy có thể giữ lại hoặc bỏ để nhẹ DB
            };
        });

        // Sử dụng createMany để lưu hàng loạt
        const result = await prisma.healthMetric.createMany({
            data: dataToInsert,
            skipDuplicates: true // Nếu trùng user_id và record_time thì không lưu đè
        });

        console.log(`✅ [Sync] Đã lưu thành công ${result.count} bản ghi cho User: ${currentUserId}`);

        return res.status(201).json({ 
            status: "success", 
            count: result.count,
            message: "Đồng bộ dữ liệu thành công" 
        });
    } catch (error) {
        console.error("❌ [Sync Error]:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * 2. LẤY DỮ LIỆU CHO MOBILE (Gom nhóm và tính toán cho Biểu đồ)
 */
export const getHealthMetrics = async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const days = parseInt(req.query.days) || 30; // Mặc định lấy 30 ngày cho biểu đồ
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await prisma.healthMetric.findMany({
            where: {
                user_id: currentUserId,
                record_time: { gte: startDate }
            },
            orderBy: { record_time: 'asc' }
        });

        // Gom nhóm dữ liệu theo ngày để Frontend vẽ biểu đồ tổng quan
        const groups = metrics.reduce((acc, curr) => {
            const date = curr.record_time.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { 
                    steps: 0, 
                    calories: 0, 
                    distance: 0, 
                    sleep_duration: 0,
                    hr_samples: [], 
                    spo2_samples: [] 
                };
            }
            
            if (curr.steps) acc[date].steps += curr.steps;
            if (curr.calories) acc[date].calories += curr.calories;
            if (curr.distance) acc[date].distance += curr.distance;
            if (curr.sleep_duration) acc[date].sleep_duration += curr.sleep_duration;
            
            if (curr.heart_rate) acc[date].hr_samples.push(curr.heart_rate);
            if (curr.blood_oxygen) acc[date].spo2_samples.push(curr.blood_oxygen);
            
            return acc;
        }, {});

        const dailySummary = Object.keys(groups).map(date => {
            const day = groups[date];
            return {
                date,
                steps: day.steps,
                calories: Math.round(day.calories),
                distance: parseFloat(day.distance.toFixed(2)),
                sleep_hours: parseFloat((day.sleep_duration / 60).toFixed(1)),
                avg_hr: day.hr_samples.length > 0 
                    ? Math.round(day.hr_samples.reduce((a, b) => a + b) / day.hr_samples.length) 
                    : 0,
                avg_spo2: day.spo2_samples.length > 0 
                    ? parseFloat((day.spo2_samples.reduce((a, b) => a + b) / day.spo2_samples.length).toFixed(1)) 
                    : 0
            };
        });

        return res.status(200).json({
            status: "success",
            daily_summary: dailySummary,
            raw_data: metrics 
        });
    } catch (error) {
        console.error("❌ Lỗi lấy Metrics:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }
};