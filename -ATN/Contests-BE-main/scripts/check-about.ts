const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndSeedAbout() {
    try {
        console.log('Checking About table...');
        
        // Check if About table has any records
        const aboutCount = await prisma.about.count();
        console.log('About records count:', aboutCount);

        if (aboutCount === 0) {
            console.log('Creating initial About record...');
            // Create the initial About record
            const about = await prisma.about.create({
                data: {
                    title: 'Olympic Toán học',
                    description: 'Cuộc thi Olympic Toán học dành cho học sinh trung học phổ thông',
                    logo: null,
                    banner: null
                }
            });
            console.log('Created About record:', about);
        } else {
            // Show existing records
            const abouts = await prisma.about.findMany();
            console.log('Existing About records:', abouts);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
        console.log('Done!');
    }
}

checkAndSeedAbout();
