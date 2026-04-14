import prisma from '../lib/prisma.js';

/**
 * 1. ĐỒNG BỘ DỮ LIỆU THỰC TỪ APP (Health Connect / Google Fit)
 */
export const syncHealthData = async (req, res) => {
    try {
        const { data } = req.body; 
        const currentUserId = req.user.user_id;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ status: "error", message: "Dữ liệu không hợp lệ." });
        }

        const dataToInsert = data.map((item) => {
            const val = parseFloat(item.value);
            return {
                user_id: currentUserId,
                record_time: new Date(item.time),
                // LƯU Ý: Gán type để khớp với @@unique trong Prisma
                type: item.type, 
                heart_rate: item.type === 'HEART_RATE' ? Math.round(val) : null,
                steps: item.type === 'STEPS' ? Math.round(val) : null,
                blood_oxygen: item.type === 'BLOOD_OXYGEN' ? val : null,
                calories: item.type === 'CALORIES' ? val : null,
                distance: item.type === 'DISTANCE' ? val : null,
                sleep_duration: item.type === 'SLEEP' ? Math.round(val) : null, 
                raw_data: item 
            };
        });

        const result = await prisma.healthMetric.createMany({
            data: dataToInsert,
            skipDuplicates: true // Sẽ dựa trên user_id + record_time + type
        });

        return res.status(201).json({ status: "success", count: result.count });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * 2. LẤY DỮ LIỆU CHO MOBILE (Gom nhóm và tính toán chỉ số)
 */
export const getHealthMetrics = async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const days = parseInt(req.query.days) || 7; 
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Lấy tất cả bản ghi trong khoảng thời gian xác định
        const metrics = await prisma.healthMetric.findMany({
            where: {
                user_id: currentUserId,
                record_time: { gte: startDate }
            },
            orderBy: { record_time: 'asc' }
        });

        // Gom nhóm theo ngày
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
            
            // Tính tổng các chỉ số tích lũy
            if (curr.steps) acc[date].steps += curr.steps;
            if (curr.calories) acc[date].calories += curr.calories;
            if (curr.distance) acc[date].distance += curr.distance;
            if (curr.sleep_duration) acc[date].sleep_duration += curr.sleep_duration;
            
            // Thu thập mẫu để tính trung bình
            if (curr.heart_rate) acc[date].hr_samples.push(curr.heart_rate);
            if (curr.blood_oxygen) acc[date].spo2_samples.push(curr.blood_oxygen);
            
            return acc;
        }, {});

        // Chuyển đổi object sang mảng để dễ vẽ biểu đồ ở Frontend
        const dailySummary = Object.keys(groups).map(date => {
            const day = groups[date];
            return {
                date,
                steps: day.steps,
                calories: Math.round(day.calories),
                distance: parseFloat(day.distance.toFixed(2)),
                sleep_hours: parseFloat((day.sleep_duration / 60).toFixed(1)), // Đổi từ phút sang giờ nếu cần
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
            raw_data: metrics // Trả về cả dữ liệu thô để app tính Min/Max/Current
        });
    } catch (error) {
        console.error("❌ Lỗi lấy Metrics:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }
};