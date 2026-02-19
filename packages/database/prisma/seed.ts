
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@hypechart.com';
    const password = 'password123';
    const brandName = 'HypeChart Admin';
    const name = 'Admin User';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simple slug
    const slug = 'hypechart-admin';

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: hashedPassword,
                name,
                brandName,
                slug
            },
        });

        console.log(`✅ Admin User Seeded:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${password}`);

    } catch (e) {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
