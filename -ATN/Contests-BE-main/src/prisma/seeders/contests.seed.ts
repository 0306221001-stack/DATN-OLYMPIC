import { SeedParams } from "@/types/seed";
import { ContestStatus } from "@prisma/client";

export default async function seedContests({ prisma, logger }: SeedParams) {
  try {
    await prisma.contest.deleteMany();

    const contests = [
      {
        name: "Cuộc thi Đường lên đỉnh Olympia 2025",
        slug: "duong-len-dinh-olympia-2025",
        rule: `
                    <h3>QUY ĐỊNH CUỘC THI</h3>
                    <ol>
                        <li>Cuộc thi dành cho học sinh THPT</li>
                        <li>Mỗi trường được cử tối đa 5 thí sinh tham gia</li>
                        <li>Cuộc thi gồm 4 phần: Khởi động, Tăng tốc, Về đích, Câu hỏi phụ</li>
                        <li>Thí sinh cần tuân thủ quy định về thời gian làm bài</li>
                        <li>Nghiêm cấm gian lận dưới mọi hình thức</li>
                    </ol>
                `,
        plainText:
          "Cuộc thi Đường lên đỉnh Olympia là cuộc thi trí tuệ dành cho học sinh trung học phổ thông...",
        location: "Đài Truyền hình Việt Nam, Hà Nội",
        startTime: new Date("2025-03-01T08:00:00Z"),
        endTime: new Date("2025-12-31T18:00:00Z"),
        status: ContestStatus.upcoming,
      },
      {
        name: "Cuộc thi Tin học trẻ toàn quốc 2025",
        slug: "tin-hoc-tre-toan-quoc-2025",
        rule: `
                    <h3>QUY ĐỊNH CUỘC THI</h3>
                    <ol>
                        <li>Cuộc thi dành cho học sinh THCS và THPT</li>
                        <li>Thi đấu theo nhóm 3 người</li>
                        <li>Sử dụng ngôn ngữ lập trình C/C++, Pascal, Python</li>
                        <li>Thời gian thi: 180 phút</li>
                        <li>Được sử dụng tài liệu tham khảo</li>
                    </ol>
                `,
        plainText:
          "Cuộc thi Tin học trẻ toàn quốc nhằm khuyến khích học sinh yêu thích môn Tin học...",
        location: "Trường Đại học Bách khoa Hà Nội",
        startTime: new Date("2025-04-15T08:00:00Z"),
        endTime: new Date("2025-04-17T18:00:00Z"),
        status: ContestStatus.upcoming,
      },
      {
        name: "Hội thi Tin học văn phòng 2025",
        slug: "tin-hoc-van-phong-2025",
        rule: `
                    <h3>QUY ĐỊNH CUỘC THI</h3>
                    <ol>
                        <li>Cuộc thi dành cho học sinh lớp 10, 11, 12</li>
                        <li>Thi cá nhân</li>
                        <li>Sử dụng Microsoft Office (Word, Excel, PowerPoint)</li>
                        <li>Thời gian thi: 120 phút</li>
                        <li>Không được sử dụng Internet</li>
                    </ol>
                `,
        plainText:
          "Hội thi Tin học văn phòng nhằm nâng cao kỹ năng sử dụng máy tính của học sinh...",
        location: "Trung tâm Tin học, TP.HCM",
        startTime: new Date("2025-05-20T08:00:00Z"),
        endTime: new Date("2025-05-22T17:00:00Z"),
        status: ContestStatus.upcoming,
      },
    ];

    const createdContests = await Promise.all(
      contests.map(contest => prisma.contest.create({ data: contest }))
    );

    logger.info(`Tạo thành công ${createdContests.length} cuộc thi`);
    return createdContests;
  } catch (error) {
    logger.error("Lỗi khi tạo dữ liệu cuộc thi:", error);
    throw error;
  }
}
