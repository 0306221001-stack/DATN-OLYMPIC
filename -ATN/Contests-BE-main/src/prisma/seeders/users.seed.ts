import { SeedParams } from "@/types/seed";
import { hash } from "bcrypt";

export default async function seedUsers({
  prisma,
  logger,
  env = process.env,
}: SeedParams) {
  try {
    await prisma.user.deleteMany();
    const username = env.UsernameAdmin || "admin";
    const password = env.PasswordAdmin || "admin123";
    const email = env.EmailAdmin || "admin@example.com";
    const adminPassword = await hash(password, 10);
    const adminUser = await prisma.user.create({
      data: {
        username,
        email,
        password: adminPassword,
        role: "Admin",
      },
    });

    logger.info(
      `Tạo tài khoản admin thành công: ${adminUser.username} với email ${adminUser.email}`
    );
    return adminUser;
  } catch (error) {
    logger.error("Tạo tài khoản admin thất bại:", error);
    throw error;
  }
}
