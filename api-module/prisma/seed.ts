import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('AdminPass123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('👑 Created admin user:', admin.email);

  // Create regular user
  const userPassword = await bcrypt.hash('UserPass123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      role: 'USER',
    },
  });

  console.log('👤 Created regular user:', user.email);

  // Create sample posts
  const posts = await Promise.all([
    prisma.post.upsert({
      where: { id: 'sample-post-1' },
      update: {},
      create: {
        id: 'sample-post-1',
        title: 'Welcome to the API',
        content: 'This is a sample post demonstrating the API functionality. You can create, read, update, and delete posts through the RESTful endpoints.',
        published: true,
        authorId: admin.id,
      },
    }),
    prisma.post.upsert({
      where: { id: 'sample-post-2' },
      update: {},
      create: {
        id: 'sample-post-2',
        title: 'API Documentation',
        content: 'Check out the comprehensive API documentation to understand all available endpoints, request/response formats, and authentication requirements.',
        published: true,
        authorId: admin.id,
      },
    }),
    prisma.post.upsert({
      where: { id: 'sample-post-3' },
      update: {},
      create: {
        id: 'sample-post-3',
        title: 'Draft Post',
        content: 'This is a draft post that is not yet published. Only authenticated users can see draft posts.',
        published: false,
        authorId: user.id,
      },
    }),
  ]);

  console.log('📝 Created sample posts:', posts.length);

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Admin user: ${admin.email} (password: AdminPass123)`);
  console.log(`- Regular user: ${user.email} (password: UserPass123)`);
  console.log(`- Published posts: ${posts.filter(p => p.published).length}`);
  console.log(`- Draft posts: ${posts.filter(p => !p.published).length}`);
  console.log('\n🚀 You can now start the server and test the API!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });