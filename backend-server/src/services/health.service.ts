import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getHealthChartData = async (userId: string, viewType: 'day' | 'week' | 'month') => {
  const now = new Date();
  let startTime = new Date();

  // 1. Xác định khoảng thời gian dựa trên viewType
  if (viewType === 'day') {
    startTime.setHours(0, 0, 0, 0); // Từ 00:00 hôm nay
  } else if (viewType === 'week') {
    startTime.setDate(now.getDate() - 7); // 7 ngày gần nhất
  } else if (viewType === 'month') {
    startTime.setMonth(now.getMonth() - 1); // 1 tháng gần nhất
  }

  // 2. Fetch dữ liệu thô từ Database
  const metrics = await prisma.healthMetric.findMany({
    where: {
      user_id: userId,
      record_time: { gte: startTime, lte: now },
    },
    orderBy: { record_time: 'asc' },
  });

  // 3. Xử lý dữ liệu theo từng loại biểu đồ
  if (viewType === 'day') {
    // Biểu đồ ngày: Trả về chi tiết từng mốc (thường gom theo mỗi 15-30p để biểu đồ mượt)
    return metrics.map(m => ({
      time: m.record_time,
      heartRate: m.heart_rate,
      steps: m.steps,
      sleepStage: (m.raw_data as any)?.sleep_stages, // 4, 5, 6
      bloodOxygen: m.blood_oxygen
    }));
  }

  // Biểu đồ Tuần/Tháng: Cần Group theo Ngày
  const dailyGroups: Record<string, any> = {};

  metrics.forEach(m => {
    const dayKey = m.record_time.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!dailyGroups[dayKey]) {
      dailyGroups[dayKey] = {
        date: dayKey,
        totalSteps: 0,
        avgHeartRate: [],
        totalSleep: 0,
        deepSleep: 0,
      };
    }

    const group = dailyGroups[dayKey];
    if (m.steps) group.totalSteps += m.steps;
    if (m.heart_rate) group.avgHeartRate.push(m.heart_rate);
    
    // Xử lý giấc ngủ chi tiết
    if (m.sleep_duration) {
      group.totalSleep += m.sleep_duration;
      if ((m.raw_data as any)?.sleep_stages === 5) { // Stage 5 là Deep Sleep
        group.deepSleep += m.sleep_duration;
      }
    }
  });

  // Chuyển sang mảng và tính toán giá trị trung bình
  return Object.values(dailyGroups).map(g => ({
    date: g.date,
    steps: g.totalSteps,
    sleepHours: (g.totalSleep / 60).toFixed(1),
    deepSleepHours: (g.deepSleep / 60).toFixed(1),
    heartRate: g.avgHeartRate.length > 0 
      ? Math.round(g.avgHeartRate.reduce((a:any, b:any) => a + b, 0) / g.avgHeartRate.length) 
      : 0
  }));
};