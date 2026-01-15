
import { PrismaClient } from '@brand-order-system/database';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    try {
        const variant = await prisma.variant.findFirst({
            where: {
                inventoryCount: { gt: 0 }
            }
        });
        if (variant) {
            fs.writeFileSync('../variant_id.txt', variant.id);
            console.log("Wrote ID to file");
        } else {
            console.log("NO_VARIANT_FOUND");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
