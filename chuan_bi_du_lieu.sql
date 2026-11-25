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
UPDATE matches SET status = 'upcoming', currentQuestion = 1, remainingTime = NULL WHERE id = 2;

-- 6) Câu hỏi dự phòng: một trận có 13 câu chính, câu có thứ tự > 13 trong gói là câu
--    dự phòng (web admin hiện ở khu "CÂU DỰ PHÒNG", màn chiếu ghi "Dự phòng 1, 2...").
--    Tạo 3 câu dự phòng mẫu rồi gắn vào cuối mọi gói câu hỏi (sau câu 13 hoặc sau câu
--    cuối cùng nếu gói đã dài hơn). Chạy lại không tạo trùng.
INSERT INTO questions (intro, defaultTime, questionType, content, options, correctAnswer, score, difficulty, explanation, questionTopicId, isActive, createdAt, updatedAt)
SELECT 'Câu hỏi dự phòng', 30, 'multiple_choice',
       '<p>[Dự phòng 1] Thiết bị nào dùng để kết nối các mạng máy tính khác nhau và định tuyến gói tin?</p>',
       JSON_ARRAY('Switch', 'Router', 'Hub', 'Repeater'), 'Router', 30, 'Rc',
       'Router (bộ định tuyến) chọn đường đi cho gói tin giữa các mạng khác nhau.',
       (SELECT MIN(id) FROM question_topics), 1, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '<p>[Dự phòng 1]%');

INSERT INTO questions (intro, defaultTime, questionType, content, options, correctAnswer, score, difficulty, explanation, questionTopicId, isActive, createdAt, updatedAt)
SELECT 'Câu hỏi dự phòng', 30, 'multiple_choice',
       '<p>[Dự phòng 2] Trong hệ nhị phân, số 1010 bằng bao nhiêu trong hệ thập phân?</p>',
       JSON_ARRAY('8', '10', '12', '5'), '10', 30, 'Rc',
       '1010 = 1x8 + 0x4 + 1x2 + 0x1 = 10.',
       (SELECT MIN(id) FROM question_topics), 1, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '<p>[Dự phòng 2]%');

INSERT INTO questions (intro, defaultTime, questionType, content, options, correctAnswer, score, difficulty, explanation, questionTopicId, isActive, createdAt, updatedAt)
SELECT 'Câu hỏi dự phòng', 30, 'multiple_choice',
       '<p>[Dự phòng 3] Ngôn ngữ nào dùng để định dạng giao diện trang web?</p>',
       JSON_ARRAY('HTML', 'SQL', 'CSS', 'Python'), 'CSS', 30, 'Gold',
       'CSS (Cascading Style Sheets) quy định màu sắc, bố cục, phông chữ của trang web.',
       (SELECT MIN(id) FROM question_topics), 1, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE content LIKE '<p>[Dự phòng 3]%');

-- Gắn lần lượt từng câu dự phòng vào cuối mỗi gói (mỗi lệnh chạy sau lệnh trước
-- nên thứ tự luôn tăng dần: 14, 15, 16 với gói 13 câu).
INSERT INTO question_details (questionId, questionPackageId, questionOrder, isActive, createdAt, updatedAt)
SELECT q.id, p.id,
       GREATEST(13, COALESCE((SELECT MAX(d.questionOrder) FROM question_details d WHERE d.questionPackageId = p.id), 0)) + 1,
       1, NOW(3), NOW(3)
FROM question_packages p
JOIN questions q ON q.content LIKE '<p>[Dự phòng 1]%'
WHERE NOT EXISTS (SELECT 1 FROM question_details x WHERE x.questionPackageId = p.id AND x.questionId = q.id);

INSERT INTO question_details (questionId, questionPackageId, questionOrder, isActive, createdAt, updatedAt)
SELECT q.id, p.id,
       GREATEST(13, COALESCE((SELECT MAX(d.questionOrder) FROM question_details d WHERE d.questionPackageId = p.id), 0)) + 1,
       1, NOW(3), NOW(3)
FROM question_packages p
JOIN questions q ON q.content LIKE '<p>[Dự phòng 2]%'
WHERE NOT EXISTS (SELECT 1 FROM question_details x WHERE x.questionPackageId = p.id AND x.questionId = q.id);

INSERT INTO question_details (questionId, questionPackageId, questionOrder, isActive, createdAt, updatedAt)
SELECT q.id, p.id,
       GREATEST(13, COALESCE((SELECT MAX(d.questionOrder) FROM question_details d WHERE d.questionPackageId = p.id), 0)) + 1,
       1, NOW(3), NOW(3)
FROM question_packages p
JOIN questions q ON q.content LIKE '<p>[Dự phòng 3]%'
WHERE NOT EXISTS (SELECT 1 FROM question_details x WHERE x.questionPackageId = p.id AND x.questionId = q.id);
