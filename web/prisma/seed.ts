import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function ensureCafe() {
  let cafe = await prisma.cafe.findUnique({ where: { slug: "demo" } });
  if (!cafe) {
    cafe = await prisma.cafe.create({
      data: {
        name: "Demo Cafe",
        slug: "demo",
        contactEmail: "demo@cafe-audit.local",
        contactPhone: "+251911000000",
        status: "active",
        notes: "Default demo tenant",
      },
    });
  }

  await prisma.cafeSettings.upsert({
    where: { cafeId: cafe.id },
    update: {
      displayName: "Demo Cafe",
      tagline: "Tap a category, add to cart, and we'll bring it right over.",
      welcomeMessage: "Welcome — scan, order, and we'll bring it over.",
      footerText: "Thank you for dining with us.",
      showPrices: true,
      fontVibe: "classic",
      accentColor: "#d4af74",
      menuTheme: "dark_gold",
      vatRate: 15,
      serviceChargeRate: 10,
      lunchEnabled: true,
      lunchStart: "12:00",
      lunchEnd: "14:00",
      lunchPaid: false,
      timezone: "Africa/Addis_Ababa",
      varianceThresholdPct: 10,
    },
    create: {
      cafeId: cafe.id,
      telebirrNumber: "0912345678",
      telebirrName: "Demo Cafe",
      bankName: "Commercial Bank of Ethiopia (CBE)",
      bankAccount: "1000123456789",
      bankAccountName: "Demo Cafe PLC",
      instructions:
        "Pay the exact total shown on your receipt. Upload your Telebirr or bank screenshot with the reference number.",
      displayName: "Demo Cafe",
      tagline: "Tap a category, add to cart, and we'll bring it right over.",
      welcomeMessage: "Welcome — scan, order, and we'll bring it over.",
      footerText: "Thank you for dining with us.",
      showPrices: true,
      fontVibe: "classic",
      accentColor: "#d4af74",
      menuTheme: "dark_gold",
      vatRate: 15,
      serviceChargeRate: 10,
      lunchEnabled: true,
      lunchStart: "12:00",
      lunchEnd: "14:00",
      lunchPaid: false,
      timezone: "Africa/Addis_Ababa",
      varianceThresholdPct: 10,
    },
  });

  return cafe;
}

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  const cafe = await ensureCafe();

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      defaultVarianceThresholdPct: 10,
      defaultLunchEnabled: true,
      defaultLunchStart: "12:00",
      defaultLunchEnd: "14:00",
      defaultLunchPaid: false,
    },
  });

  await prisma.user.upsert({
    where: { username: "platform" },
    update: {
      passwordHash,
      fullName: "Platform Admin",
      role: "platform_admin",
      status: "active",
      cafeId: null,
    },
    create: {
      username: "platform",
      fullName: "Platform Admin",
      role: "platform_admin",
      passwordHash,
      status: "active",
      cafeId: null,
    },
  });

  const users: { username: string; fullName: string; role: Role; hourlyRate: number }[] = [
    { username: "admin", fullName: "System Admin", role: "admin", hourlyRate: 150 },
    { username: "manager", fullName: "Dagim Dereje", role: "manager", hourlyRate: 140 },
    { username: "auditor", fullName: "Hana Wabe", role: "auditor", hourlyRate: 110 },
    { username: "waiter1", fullName: "Biruk G/Tinsae", role: "server", hourlyRate: 80 },
    { username: "cashier1", fullName: "Kebede Alemu", role: "staff", hourlyRate: 75 },
    { username: "kitchen1", fullName: "Sara Bekele", role: "kitchen", hourlyRate: 90 },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        status: "active",
        cafeId: cafe.id,
        hourlyRate: u.hourlyRate,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
        status: "active",
        cafeId: cafe.id,
        hourlyRate: u.hourlyRate,
      },
    });
  }

  const cats = ["Hot Drinks", "Cold Drinks", "Food", "Desserts"];
  for (const name of cats) {
    await prisma.category.upsert({
      where: { cafeId_name: { cafeId: cafe.id, name } },
      update: {},
      create: { name, cafeId: cafe.id },
    });
  }

  const hot = await prisma.category.findUniqueOrThrow({
    where: { cafeId_name: { cafeId: cafe.id, name: "Hot Drinks" } },
  });
  const cold = await prisma.category.findUniqueOrThrow({
    where: { cafeId_name: { cafeId: cafe.id, name: "Cold Drinks" } },
  });
  const food = await prisma.category.findUniqueOrThrow({
    where: { cafeId_name: { cafeId: cafe.id, name: "Food" } },
  });

  let supplier = await prisma.supplier.findFirst({ where: { cafeId: cafe.id } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        cafeId: cafe.id,
        name: "Ethio Coffee Suppliers",
        contactInfo: "+251-911-000001",
        email: "orders@ethiocoffee.et",
      },
    });
  }

  const invDefs = [
    { name: "Arabica Coffee Beans", unit: "kg", currentQty: 25, minThreshold: 5, unitCost: 850 },
    { name: "Whole Milk", unit: "liter", currentQty: 40, minThreshold: 10, unitCost: 45 },
    { name: "Sugar", unit: "kg", currentQty: 15, minThreshold: 3, unitCost: 55 },
    { name: "Paper Cups (12oz)", unit: "unit", currentQty: 500, minThreshold: 100, unitCost: 2.5 },
    { name: "Croissant Dough", unit: "unit", currentQty: 80, minThreshold: 20, unitCost: 18 },
    { name: "Chocolate Syrup", unit: "liter", currentQty: 8, minThreshold: 2, unitCost: 220 },
  ];

  for (const item of invDefs) {
    const existing = await prisma.inventory.findFirst({
      where: { cafeId: cafe.id, name: item.name },
    });
    if (!existing) {
      await prisma.inventory.create({
        data: { ...item, supplierId: supplier.id, cafeId: cafe.id },
      });
    }
  }

  const coffee = await prisma.inventory.findFirstOrThrow({
    where: { cafeId: cafe.id, name: "Arabica Coffee Beans" },
  });
  const milk = await prisma.inventory.findFirstOrThrow({
    where: { cafeId: cafe.id, name: "Whole Milk" },
  });
  const sugar = await prisma.inventory.findFirstOrThrow({
    where: { cafeId: cafe.id, name: "Sugar" },
  });
  const cups = await prisma.inventory.findFirstOrThrow({
    where: { cafeId: cafe.id, name: "Paper Cups (12oz)" },
  });
  const dough = await prisma.inventory.findFirstOrThrow({
    where: { cafeId: cafe.id, name: "Croissant Dough" },
  });

  const productDefs = [
    {
      name: "Espresso",
      price: 35,
      categoryId: hot.id,
      recipes: [
        [coffee.id, 0.018],
        [sugar.id, 0.005],
      ] as [number, number][],
    },
    {
      name: "Cappuccino",
      price: 45,
      categoryId: hot.id,
      recipes: [
        [coffee.id, 0.018],
        [milk.id, 0.15],
        [sugar.id, 0.008],
        [cups.id, 1],
      ] as [number, number][],
    },
    {
      name: "Latte",
      price: 50,
      categoryId: hot.id,
      recipes: [
        [coffee.id, 0.018],
        [milk.id, 0.25],
        [cups.id, 1],
      ] as [number, number][],
    },
    {
      name: "Iced Latte",
      price: 55,
      categoryId: cold.id,
      recipes: [
        [coffee.id, 0.018],
        [milk.id, 0.2],
        [cups.id, 1],
      ] as [number, number][],
    },
    {
      name: "Croissant",
      price: 40,
      categoryId: food.id,
      recipes: [[dough.id, 1]] as [number, number][],
    },
  ];

  for (const p of productDefs) {
    let product = await prisma.product.findFirst({
      where: { cafeId: cafe.id, name: p.name },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          cafeId: cafe.id,
          name: p.name,
          price: p.price,
          categoryId: p.categoryId,
          description: p.name,
        },
      });
    }
    for (const [itemId, qty] of p.recipes) {
      await prisma.recipe.upsert({
        where: { productId_itemId: { productId: product.id, itemId } },
        update: { qtyNeeded: qty },
        create: { productId: product.id, itemId, qtyNeeded: qty },
      });
    }
  }

  const tableCount = await prisma.restaurantTable.count({ where: { cafeId: cafe.id } });
  if (tableCount === 0) {
    for (let i = 1; i <= 8; i++) {
      await prisma.restaurantTable.create({
        data: {
          cafeId: cafe.id,
          tableNumber: `T${String(i).padStart(2, "0")}`,
          qrToken: randomBytes(16).toString("hex"),
          capacity: i <= 2 ? 2 : i === 7 ? 8 : 4,
        },
      });
    }
  }

  // Backfill any orphan rows still missing cafeId
  await prisma.$executeRawUnsafe(`UPDATE users SET cafe_id = ${cafe.id} WHERE cafe_id IS NULL AND role <> 'platform_admin'`);
  for (const t of [
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
    "login_logs",
  ]) {
    await prisma.$executeRawUnsafe(`UPDATE ${t} SET cafe_id = ${cafe.id} WHERE cafe_id IS NULL`);
  }

  console.log("Seed complete.");
  console.log("  Platform: platform / admin123");
  console.log("  Demo cafe: manager / admin123 (and admin, auditor, waiter1, cashier1, kitchen1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
