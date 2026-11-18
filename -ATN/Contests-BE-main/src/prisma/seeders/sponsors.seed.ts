import { SeedParams } from "@/types/seed";

export default async function seedSponsors({ prisma, logger }: SeedParams) {
    try {
        await prisma.sponsor.deleteMany();
        
        const sponsors = [
            {
                name: "Tập đoàn Vingroup",
                logo: "/uploads/sponsors/logos/vingroup-logo.svg",
                images: "/uploads/sponsors/images/vingroup-gallery.svg",
                videos: "/uploads/sponsors/videos/vingroup-gallery.jpg"
            },
            {
                name: "Ngân hàng Vietcombank",
                logo: "/uploads/sponsors/logos/vietcombank-logo.svg", 
                images: "/uploads/sponsors/images/vietcombank-gallery.svg",
                videos: "/uploads/sponsors/videos/vietcombank-intro.mp4"
            },
            {
                name: "Tập đoàn FPT",
                logo: "/uploads/sponsors/logos/fpt-logo.svg",
                images: "/uploads/sponsors/images/fpt-gallery.svg", 
                videos: "/uploads/sponsors/videos/fpt-intro.mp4"
            },
            {
                name: "Công ty Samsung Việt Nam",
                logo: "/uploads/sponsors/logos/samsung-logo.svg",
                images: "/uploads/sponsors/images/samsung-gallery.svg",
                videos: "/uploads/sponsors/videos/samsung-intro.mp4"
            },
            {
                name: "Tập đoàn Masan",
                logo: "/uploads/sponsors/logos/masan-logo.svg",
                images: "/uploads/sponsors/images/masan-gallery.svg",
                videos: "/uploads/sponsors/videos/masan-intro.mp4"
            },
            {
                name: "Công ty Grab Việt Nam",
                logo: "/uploads/sponsors/logos/grab-logo.svg",
                images: "/uploads/sponsors/images/grab-gallery.svg",
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
