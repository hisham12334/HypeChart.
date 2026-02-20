import { PrismaClient } from '@brand-order-system/database';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);

    const name = args[0];
    const brandName = args[1];
    const email = args[2];
    const plainPassword = args[3];

    if (!name || !brandName || !email || !plainPassword) {
        console.log("Usage:");
        console.log("pnpm create-brand \"Name\" \"Brand Name\" \"email\" \"password\"");
        process.exit(1);
    }

    const existing = await prisma.user.findUnique({
        where: { email }
    });

    if (existing) {
        console.log("❌ User already exists.");
        return;
    }

    const password = await bcrypt.hash(plainPassword, 10);
    const slug = slugify(brandName, { lower: true });

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password,
            brandName,
            slug,
        }
    });

    console.log("✅ Brand onboarded successfully!");
    console.log("User ID:", user.id);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());