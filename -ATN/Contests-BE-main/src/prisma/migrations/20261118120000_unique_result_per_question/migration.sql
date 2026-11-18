-- Mỗi thí sinh chỉ có một kết quả cho mỗi câu của một trận.
-- Bước 1: xóa các dòng trùng (giữ dòng có id nhỏ nhất) để thêm được ràng buộc.
DELETE r1 FROM `results` r1
JOIN `results` r2
  ON r1.`contestant_id` = r2.`contestant_id`
 AND r1.`match_id` = r2.`match_id`
 AND r1.`questionOrder` = r2.`questionOrder`
 AND r1.`id` > r2.`id`;

-- Bước 2: chặn trùng ở mức DB.
CREATE UNIQUE INDEX `results_contestant_match_question_key`
  ON `results`(`contestant_id`, `match_id`, `questionOrder`);
