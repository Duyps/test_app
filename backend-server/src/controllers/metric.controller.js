import prisma from '../lib/prisma.js';

/**
 * 1. ĐỒNG BỘ DỮ LIỆU THỰC TỪ APP (Hỗ trợ vét cạn Stages và Heart Rate)
 */
export const syncHealthData = async (req, res) => {
    try {
        const { data } = req.body;
        const currentUserId = req.user.user_id;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ status: "error", message: "Dữ liệu không hợp lệ." });
        }

        const dataToInsert = data.map((item) => {
            return {
                user_id: currentUserId,
                record_time: new Date(item.record_time),
                heart_rate: item.heart_rate ? Math.round(item.heart_rate) : null,
                steps: item.steps ? Math.round(item.steps) : null,
                blood_oxygen: item.blood_oxygen ? parseFloat(item.blood_oxygen) : null,
                calories: item.calories ? parseFloat(item.calories) : null,
                distance: item.distance ? parseFloat(item.distance) : null,
                sleep_duration: item.sleep_duration ? Math.round(item.sleep_duration) : null,
                raw_data: item.raw_data || null, // Lưu stages: { sleep_stages: 5 }
            };
        });

        // skipDuplicates: true sẽ bỏ qua nếu trùng [user_id, record_time] nhờ @@unique Duy đã tạo
        const result = await prisma.healthMetric.createMany({
            data: dataToInsert,
            skipDuplicates: true 
        });

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
 * 2. LẤY DỮ LIỆU CHO MOBILE (Hỗ trợ Ngày/Tuần/Tháng cho biểu đồ)
 */
export const getHealthMetrics = async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { range = 'day' } = req.query; // 'day' | 'week' | 'month'
        
        const now = new Date();
        let startDate = new Date();

        // Thiết lập khoảng thời gian lọc
        if (range === 'day') startDate.setHours(0, 0, 0, 0);
        else if (range === 'week') startDate.setDate(now.getDate() - 7);
        else if (range === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setDate(now.getDate() - 30); // Default 30 ngày

        const metrics = await prisma.healthMetric.findMany({
            where: {
                user_id: currentUserId,
                record_time: { gte: startDate }
            },
            orderBy: { record_time: 'asc' }
        });

        // Gom nhóm dữ liệu theo ngày (Dùng cho biểu đồ Bar Chart Tuần/Tháng)
        const groups = metrics.reduce((acc, curr) => {
            const date = curr.record_time.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { 
                    steps: 0, 
                    calories: 0, 
                    distance: 0, 
                    sleep_duration: 0,
                    deep_sleep: 0, // Tính riêng thời gian ngủ sâu
                    hr_samples: [], 
                    spo2_samples: [] 
                };
            }
            
            if (curr.steps) acc[date].steps += curr.steps;
            if (curr.calories) acc[date].calories += curr.calories;
            if (curr.distance) acc[date].distance += curr.distance;
            
            if (curr.sleep_duration) {
                acc[date].sleep_duration += curr.sleep_duration;
                // Nếu là Stage 5 (Deep Sleep) thì cộng dồn vào deep_sleep
                if (curr.raw_data && curr.raw_data.sleep_stages === 5) {
                    acc[date].deep_sleep += curr.sleep_duration;
                }
            }
            
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
                deep_sleep_hours: parseFloat((day.deep_sleep / 60).toFixed(1)),
                avg_hr: day.hr_samples.length > 0 
                    ? Math.round(day.hr_samples.reduce((a, b) => a + b) / day.hr_samples.length) 
                    : 0,
                avg_spo2: day.spo2_samples.length > 0 
                    ? parseFloat((day.spo2_samples.reduce((a, b) => a + b) / day.spo2_samples.length).toFixed(1)) 
                    : 0
            };
        });

        // Cấu trúc response tối ưu cho cả biểu đồ Ngày (mịn) và Tuần/Tháng (gom nhóm)
        return res.status(200).json({
            status: "success",
            view_range: range,
            daily_summary: dailySummary,
            raw_data: metrics.map(m => ({
                ...m,
                // Trả ra stage để Mobile dễ vẽ Hypnogram
                sleep_stage: m.raw_data?.sleep_stages || null 
            }))
        });
    } catch (error) {
        console.error("❌ Lỗi lấy Metrics:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }
};