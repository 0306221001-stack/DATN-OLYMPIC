import { SeedParams } from "@/types/seed";

export default async function seedSponsors({ prisma, logger }: SeedParams) {
    try {
        await prisma.sponsor.deleteMany();
        
        const sponsors = [
            {
                name: "Tập đoàn Vingroup",
                logo: "/uploads/sponsors/logos/vingroup-gallery.jpg",
                images: "/uploads/sponsors/images/vingroup-gallery.jpg",
                videos: "/uploads/sponsors/videos/vingroup-gallery.jpg"
            },
            {
                name: "Ngân hàng Vietcombank",
                logo: "/uploads/sponsors/logos/vietcombank-logo.png", 
                images: "/uploads/sponsors/images/vietcombank-gallery.jpg",
                videos: "/uploads/sponsors/videos/vietcombank-intro.mp4"
            },
            {
                name: "Tập đoàn FPT",
                logo: "/uploads/sponsors/logos/fpt-logo.png",
                images: "/uploads/sponsors/images/fpt-gallery.jpg", 
                videos: "/uploads/sponsors/videos/fpt-intro.mp4"
            },
            {
                name: "Công ty Samsung Việt Nam",
                logo: "/uploads/sponsors/logos/samsung-logo.png",
                images: "/uploads/sponsors/images/samsung-gallery.jpg",
                videos: "/uploads/sponsors/videos/samsung-intro.mp4"
            },
            {
                name: "Tập đoàn Masan",
                logo: "/uploads/sponsors/logos/masan-logo.png",
                images: "/uploads/sponsors/images/masan-gallery.jpg",
                videos: "/uploads/sponsors/videos/masan-intro.mp4"
            },
            {
                name: "Công ty Grab Việt Nam",
                logo: "/uploads/sponsors/logos/grab-logo.png",
                images: "/uploads/sponsors/images/grab-gallery.jpg",
                videos: "/uploads/sponsors/videos/grab-intro.mp4"
            }
        ];

        const createdSponsors = await Promise.all(
            sponsors.map(sponsor => prisma.sponsor.create({ data: sponsor }))
        );

        logger.info(`Tạo thành công ${createdSponsors.length} nhà tài trợ`);
        return createdSponsors;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu nhà tài trợ:", error);
        throw error;
    }
}
