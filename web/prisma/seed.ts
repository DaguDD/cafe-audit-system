import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const users: { username: string; fullName: string; role: Role }[] = [
    { username: "admin", fullName: "System Admin", role: "admin" },
    { username: "manager", fullName: "Dagim Dereje", role: "manager" },
    { username: "auditor", fullName: "Hana Wabe", role: "auditor" },
    { username: "waiter1", fullName: "Biruk G/Tinsae", role: "server" },
    { username: "cashier1", fullName: "Kebede Alemu", role: "staff" },
    { username: "kitchen1", fullName: "Sara Bekele", role: "kitchen" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, fullName: u.fullName, role: u.role, status: "active" },
      create: { ...u, passwordHash, status: "active" },
    });
  }

  const cats = ["Hot Drinks", "Cold Drinks", "Food", "Desserts"];
  for (const name of cats) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const hot = await prisma.category.findUniqueOrThrow({ where: { name: "Hot Drinks" } });
  const cold = await prisma.category.findUniqueOrThrow({ where: { name: "Cold Drinks" } });
  const food = await prisma.category.findUniqueOrThrow({ where: { name: "Food" } });

  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
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
    const existing = await prisma.inventory.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.inventory.create({
        data: { ...item, supplierId: supplier.id },
      });
    }
  }

  const coffee = await prisma.inventory.findFirstOrThrow({ where: { name: "Arabica Coffee Beans" } });
  const milk = await prisma.inventory.findFirstOrThrow({ where: { name: "Whole Milk" } });
  const sugar = await prisma.inventory.findFirstOrThrow({ where: { name: "Sugar" } });
  const cups = await prisma.inventory.findFirstOrThrow({ where: { name: "Paper Cups (12oz)" } });
  const dough = await prisma.inventory.findFirstOrThrow({ where: { name: "Croissant Dough" } });

  const productDefs = [
    { name: "Espresso", price: 35, categoryId: hot.id, recipes: [[coffee.id, 0.018], [sugar.id, 0.005]] as [number, number][] },
    { name: "Cappuccino", price: 45, categoryId: hot.id, recipes: [[coffee.id, 0.018], [milk.id, 0.15], [sugar.id, 0.008], [cups.id, 1]] as [number, number][] },
    { name: "Latte", price: 50, categoryId: hot.id, recipes: [[coffee.id, 0.018], [milk.id, 0.25], [cups.id, 1]] as [number, number][] },
    { name: "Iced Latte", price: 55, categoryId: cold.id, recipes: [[coffee.id, 0.018], [milk.id, 0.2], [cups.id, 1]] as [number, number][] },
    { name: "Croissant", price: 40, categoryId: food.id, recipes: [[dough.id, 1]] as [number, number][] },
  ];

  for (const p of productDefs) {
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
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

  const tableCount = await prisma.restaurantTable.count();
  if (tableCount === 0) {
    for (let i = 1; i <= 8; i++) {
      await prisma.restaurantTable.create({
        data: {
          tableNumber: `T${String(i).padStart(2, "0")}`,
          qrToken: randomBytes(16).toString("hex"),
          capacity: i <= 2 ? 2 : i === 7 ? 8 : 4,
        },
      });
    }
  }

  console.log("Seed complete. Demo password for all users: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
