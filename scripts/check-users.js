// Quick script to check users in database
const { PrismaClient } = require('@brand-order-system/database');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        brandName: true,
        createdAt: true
      }
    });

    console.log('\n📊 Users in database:', users.length);
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found! You need to register a user first.');
      console.log('\nTo create a user, make a POST request to:');
      console.log('  POST http://localhost:4000/api/auth/register');
      console.log('  Body: { "email": "admin@example.com", "password": "password123", "brandName": "My Brand" }');
    } else {
      console.log('\n✅ Found users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.brandName}) - ID: ${user.id}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
