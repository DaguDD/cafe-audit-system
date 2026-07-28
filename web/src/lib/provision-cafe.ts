import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function provisionCafe(input: {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminFullName?: string;
  seedMinimal?: boolean;
}) {
  const slug = input.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!slug) throw new Error("Invalid slug");

  const existing = await prisma.cafe.findUnique({ where: { slug } });
  if (existing) throw new Error("Slug already exists");

  const passwordHash = await bcrypt.hash(input.adminPassword || "admin123", 12);
  const adminUsername = input.adminUsername || `${slug}-admin`;

  const platform = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const variance = Number(platform?.defaultVarianceThresholdPct ?? 10);
  const lunchEnabled = platform?.defaultLunchEnabled ?? true;
  const lunchStart = platform?.defaultLunchStart ?? "12:00";
  const lunchEnd = platform?.defaultLunchEnd ?? "14:00";
  const lunchPaid = platform?.defaultLunchPaid ?? false;

  const cafe = await prisma.$transaction(async (tx) => {
    const c = await tx.cafe.create({
      data: {
        name: input.name.trim(),
        slug,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        status: "trial",
        notes: input.notes || null,
        settings: {
          create: {
            telebirrNumber: "",
            telebirrName: input.name.trim(),
            bankName: "",
            bankAccount: "",
            bankAccountName: input.name.trim(),
            instructions:
              "Pay the exact total shown. Upload your payment screenshot with the reference number.",
            displayName: input.name.trim(),
            tagline: "Tap a category, add to cart, and we'll bring it right over.",
            welcomeMessage: null,
            footerText: "Thank you for dining with us.",
            showPrices: true,
            fontVibe: "classic",
            accentColor: "#d4af74",
            menuTheme: "dark_gold",
            vatRate: 15,
            serviceChargeRate: 10,
            varianceThresholdPct: variance,
            lunchEnabled,
            lunchStart,
            lunchEnd,
            lunchPaid,
            timezone: "Africa/Addis_Ababa",
          },
        },
        users: {
          create: {
            username: adminUsername,
            fullName: input.adminFullName || `${input.name} Admin`,
            role: "admin",
            passwordHash,
            status: "active",
            hourlyRate: 120,
          },
        },
      },
    });

    if (input.seedMinimal !== false) {
      const cat = await tx.category.create({
        data: { cafeId: c.id, name: "Hot Drinks" },
      });
      await tx.product.create({
        data: {
          cafeId: c.id,
          name: "Espresso",
          price: 35,
          categoryId: cat.id,
          description: "House espresso",
        },
      });
      for (let i = 1; i <= 4; i++) {
        await tx.restaurantTable.create({
          data: {
            cafeId: c.id,
            tableNumber: `T${String(i).padStart(2, "0")}`,
            qrToken: randomBytes(16).toString("hex"),
            capacity: 4,
          },
        });
      }
    }

    return c;
  });

  return { cafe, adminUsername, tempPassword: input.adminPassword || "admin123" };
}
