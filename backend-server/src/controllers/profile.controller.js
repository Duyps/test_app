import prisma from '../lib/prisma.js';

// 1. Lấy thông tin hồ sơ (kèm thông tin từ bảng User)
export const getHealthProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Không tìm thấy thông tin xác thực người dùng" });
        }

        const profile = await prisma.healthProfile.findUnique({
            where: { user_id: req.user.user_id },
            include: {
                user: {
                    select: {
                        full_name: true,
                        email: true
                    }
                }
            }
        });

        if (!profile) {
            return res.status(404).json({ message: "Người dùng chưa tạo hồ sơ sức khỏe" });
        }

        // Làm phẳng dữ liệu để Frontend dễ dùng (gom full_name ra ngoài)
        const responseData = {
            ...profile,
            full_name: profile.user?.full_name,
            email: profile.user?.email
        };
        delete responseData.user;

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Cập nhật hồ sơ (Cập nhật cả User và HealthProfile)
export const updateHealthProfile = async (req, res) => {
    const { 
        full_name, 
        height, 
        weight, 
        gender, 
        birth, 
        phone_number, 
        blood_type, 
        systolic_bp, 
        diastolic_bp 
    } = req.body;

    try {
        const userId = req.user.user_id;

        // BƯỚC A: Cập nhật Họ tên ở bảng User nếu có gửi lên
        if (full_name) {
            await prisma.user.update({
                where: { user_id: userId },
                data: { full_name: full_name }
            });
        }

        // BƯỚC B: Cập nhật hoặc Tạo mới ở bảng HealthProfile
        const profile = await prisma.healthProfile.upsert({
            where: { user_id: userId },
            update: { 
                height: height ? parseFloat(height) : null, 
                weight: weight ? parseFloat(weight) : null, 
                gender: gender, // Lưu string 'male'/'female'/'other'
                birth: birth ? new Date(birth) : null, // Chuyển chuỗi YYYY-MM-DD sang Date
                phone_number,
                blood_type,
                systolic_bp: systolic_bp ? parseInt(systolic_bp) : null, 
                diastolic_bp: diastolic_bp ? parseInt(diastolic_bp) : null 
            },
            create: { 
                user_id: userId, 
                height: height ? parseFloat(height) : null, 
                weight: weight ? parseFloat(weight) : null, 
                gender: gender, 
                birth: birth ? new Date(birth) : null,
                phone_number,
                blood_type,
                systolic_bp: systolic_bp ? parseInt(systolic_bp) : null, 
                diastolic_bp: diastolic_bp ? parseInt(diastolic_bp) : null
            },
        });

        res.status(200).json({ 
            message: "Cập nhật thành công", 
            data: { ...profile, full_name } 
        });
    } catch (error) {
        console.error("Lỗi Controller:", error);
        res.status(500).json({ error: error.message });
    }
};