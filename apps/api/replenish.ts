
import { PrismaClient } from '@brand-order-system/database';
const prisma = new PrismaClient();
const VARIANT_ID = "b1975fa2-c113-418a-88b1-849f30a7ad5b";

async function main() {
    await prisma.variant.update({
        where: { id: VARIANT_ID },
        data: { inventoryCount: 100, reservedCount: 0 }
    });
    console.log("✅ Stock replenished for " + VARIANT_ID);
}
main().finally(() => prisma.$disconnect());
