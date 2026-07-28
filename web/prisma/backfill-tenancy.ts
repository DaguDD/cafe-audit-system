/**
 * One-shot multi-tenant backfill for existing Neon data.
 * Safe to re-run: creates Demo Cafe if missing and assigns null cafe_ids.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function exec(sql: string) {
  await prisma.$executeRawUnsafe(sql);
}

async function main() {
  // Ensure cafes + settings + leads exist (in case push partially applied)
  await exec(`
    CREATE TABLE IF NOT EXISTS cafes (
      cafe_id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      contact_email VARCHAR(120),
      contact_phone VARCHAR(40),
      status TEXT NOT NULL DEFAULT 'trial',
      notes TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS cafe_settings (
      id SERIAL PRIMARY KEY,
      cafe_id INTEGER NOT NULL UNIQUE REFERENCES cafes(cafe_id) ON DELETE CASCADE,
      telebirr_number VARCHAR(40) NOT NULL DEFAULT '',
      telebirr_name VARCHAR(100) NOT NULL DEFAULT '',
      bank_name VARCHAR(100) NOT NULL DEFAULT '',
      bank_account VARCHAR(60) NOT NULL DEFAULT '',
      bank_account_name VARCHAR(100) NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      variance_threshold_pct DECIMAL(5,2) NOT NULL DEFAULT 10,
      timezone VARCHAR(60) NOT NULL DEFAULT 'Africa/Addis_Ababa'
    );
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(40),
      cafe_name VARCHAR(120),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
  `);

  // Add platform_admin to Role enum if missing
  await exec(`
    DO $$ BEGIN
      ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'platform_admin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Cafe status enum
  await exec(`
    DO $$ BEGIN
      CREATE TYPE "CafeStatus" AS ENUM ('active', 'suspended', 'trial');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'converted', 'closed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  let cafe = await prisma.$queryRawUnsafe<{ cafe_id: number }[]>(
    `SELECT cafe_id FROM cafes WHERE slug = 'demo' LIMIT 1`
  );
  if (!cafe.length) {
    await exec(`
      INSERT INTO cafes (name, slug, contact_email, contact_phone, status, notes)
      VALUES ('Demo Cafe', 'demo', 'demo@cafe-audit.local', '+251911000000', 'active', 'Default migrated tenant')
    `);
    cafe = await prisma.$queryRawUnsafe(`SELECT cafe_id FROM cafes WHERE slug = 'demo' LIMIT 1`);
  }
  const cafeId = cafe[0].cafe_id;

  await exec(`
    INSERT INTO cafe_settings (cafe_id, telebirr_number, telebirr_name, bank_name, bank_account, bank_account_name, instructions)
    SELECT ${cafeId}, '0912345678', 'Demo Cafe', 'Commercial Bank of Ethiopia (CBE)', '1000123456789', 'Demo Cafe PLC',
      'Pay the exact total shown. Upload your Telebirr or bank screenshot with the reference number.'
    WHERE NOT EXISTS (SELECT 1 FROM cafe_settings WHERE cafe_id = ${cafeId})
  `);

  const tables = [
    "users",
    "login_logs",
    "suppliers",
    "categories",
    "inventory",
    "products",
    "shifts",
    "restaurant_tables",
    "waiter_requests",
    "orders",
    "sales",
    "audit_logs",
    "waste_logs",
    "purchase_orders",
    "payment_submissions",
  ];

  for (const table of tables) {
    await exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS cafe_id INTEGER`);
    await exec(`UPDATE ${table} SET cafe_id = ${cafeId} WHERE cafe_id IS NULL`);
  }

  // Drop old global uniques that conflict with tenancy
  await exec(`
    DO $$ BEGIN
      ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE restaurant_tables DROP CONSTRAINT IF EXISTS restaurant_tables_table_number_key;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$;
  `);

  console.log(`Backfill complete. Demo cafe id=${cafeId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
