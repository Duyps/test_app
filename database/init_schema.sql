-- ==========================================
-- SCRIPT KHỞI TẠO DATABASE (PostgreSQL)
-- ==========================================

-- 1. Bảng USER (Chỉ lưu thông tin định danh và đăng nhập)
CREATE TABLE "user" (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100),
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);  

-- 2. Bảng HEALTH_PROFILE
CREATE TABLE health_profile (
    profile_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    height FLOAT,
    weight FLOAT,
    gender VARCHAR(20),      -- ĐỔI Ở ĐÂY: BOOLEAN -> VARCHAR(20)
    birth DATE,
    phone_number VARCHAR(20), -- THÊM CỘT NÀY
    blood_type VARCHAR(10),   -- THÊM CỘT NÀY
    systolic_bp INT,
    diastolic_bp INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng RELATIVE (Người thân khẩn cấp)
CREATE TABLE relative (
    relative_id VARCHAR(50) PRIMARY KEY,
    phone_num VARCHAR(20),
    user_id VARCHAR(50) REFERENCES "user"(user_id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50)
);

-- 4. Bảng DEVICE (Thiết bị/Nguồn dữ liệu)
CREATE TABLE device (
    device_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES "user"(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- vd: 'health_connect', 'apple_health'
    status VARCHAR(20),
    last_sync_time TIMESTAMP
);

-- 5. Bảng WORKOUT_SESSION (Buổi tập luyện)
CREATE TABLE workout_session (
    work_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES "user"(user_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    max_heart_rate INT,
    av_heart_rate INT,
    status VARCHAR(20)
);

-- 6. Bảng HEALTH_METRIC (Kho chứa dữ liệu khổng lồ + JSONB)
CREATE TABLE health_metric (
    health_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES "user"(user_id) ON DELETE CASCADE,
    work_id VARCHAR(50) REFERENCES workout_session(work_id) ON DELETE SET NULL, -- Cho phép NULL nếu không trong session tập
    record_time TIMESTAMP NOT NULL,
    heart_rate INT,
    steps INT,
    sleep_duration INT, -- Tính bằng phút
    stress_level INT,
    raw_data JSONB      -- Cột "ăn tiền" để lưu SpO2, HRV, data mảng...
);

-- 7. Bảng ALERT_LOG (Nhật ký cảnh báo)
CREATE TABLE alert_log (
    alert_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES "user"(user_id) ON DELETE CASCADE,
    work_id VARCHAR(50) REFERENCES workout_session(work_id) ON DELETE SET NULL, -- Cho phép NULL nếu bị cảnh báo lúc đang ngủ/nghỉ ngơi
    type VARCHAR(50) NOT NULL,
    trigger_heart_rate INT NOT NULL, -- Lưu số nhịp tim trực tiếp gây ra cảnh báo
    alert_time TIMESTAMP NOT NULL,
    is_sos_sent BOOLEAN DEFAULT FALSE
);