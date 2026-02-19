
import { PrismaClient } from '@brand-order-system/database';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@hypechart.com';
    const password = 'password123';
    const brandName = 'HypeChart Admin';
    const name = 'Admin User';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Slug generation (simple version)
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

        console.log(`User created (or already exists):`);
        console.log(`Email: ${user.email}`);
        console.log(`Password: ${password}`);
        console.log(`Brand Name: ${user.brandName}`);
        console.log(`Slug: ${user.slug}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
