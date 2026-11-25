-- ============================================================
-- Chuẩn bị dữ liệu để chạy thử hệ thống "Rung chuông vàng"
-- Chạy trong phpMyAdmin: chọn database contests_db -> tab SQL -> dán -> Thực hiện.
-- Có thể chạy lại nhiều lần (không gây lỗi, không trùng dữ liệu).
-- ============================================================

-- 1) Dữ liệu mẫu gốc để slug của trận trống; app cần slug để định tuyến.
UPDATE matches SET slug = CONCAT('tran-', id) WHERE slug IS NULL;

-- 2) Mỗi trận cần một bản ghi màn hình điều khiển, nếu thiếu admin không đổi được câu hỏi.
INSERT INTO screen_controls (controlKey, matchId, createdAt, updatedAt)
SELECT 'background', id, NOW(3), NOW(3) FROM matches
WHERE id NOT IN (SELECT matchId FROM screen_controls);

-- 3) Mật khẩu của hai trọng tài trong dữ liệu mẫu là chữ thường nên không đăng nhập được.
--    Đặt lại thành mật khẩu 123456 (đã mã hóa bcrypt).
UPDATE users
SET password = '$2b$10$9P/VCWh6wdUygfNtzPIu3Ol4/MJSVeasEMEdveloHs8fRmzLjc3Ey'
WHERE username IN ('judge1', 'judge2');

-- 4) Gắn nhà tài trợ mẫu vào cuộc thi 1 để màn "Nhà tài trợ" có dữ liệu.
UPDATE sponsors SET contestId = 1 WHERE contestId IS NULL;

-- 5) Đưa trận 2 ("Vòng loại - Trận 2") về trạng thái ban đầu để thử lại từ đầu.
DELETE FROM results WHERE match_id = 2;
UPDATE contestant_matches
SET status = 'not_started', eliminatedAtQuestionOrder = NULL, rescuedAtQuestionOrder = NULL
WHERE matchId = 2;
-- Bị loại ở trận 2 cũng làm trạng thái cấp cuộc thi thành 'eliminate', trả lại 'compete'.
UPDATE contestants SET status = 'compete'
WHERE id IN (SELECT contestantId FROM contestant_matches WHERE matchId = 2);
UPDATE matches SET status = 'upcoming', currentQuestion = 1, remainingTime = NULL WHERE id = 2;
