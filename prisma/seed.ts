import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const restaurants = [
  {
    name: "Dufo Bistro",
    address: "Zimná 189/54, Spišská Nová Ves",
    websiteUrl: "https://dufobistro.sk/",
    podjestName: "Dufo bistro",
    order: 0,
  },
  {
    name: "Burger a Pivo",
    address: "Zimná 89, Spišská Nová Ves",
    websiteUrl: "https://burgerapivo.sk/denne-menu/",
    podjestName: "MOE Sushi / Burger a Pivo",
    order: 1,
  },
  {
    name: "Grill Bar",
    address: "Zimná 73, Spišská Nová Ves",
    websiteUrl: "https://grillbar.sk/",
    podjestName: "Grillbar",
    order: 2,
  },
  {
    name: "Passion Café",
    address: "Spišská Nová Ves",
    websiteUrl: null,
    podjestName: "Passion cafe",
    order: 3,
  },
  {
    name: "Joe's CookHouse",
    address: "Štefánikova 3, Smižany",
    websiteUrl: "https://joescookhouse.sk/menu/",
    podjestName: "joe's COOKHOUSE",
    order: 4,
  },
  {
    name: "Dufart",
    address: "Letná 43A, Spišská Nová Ves",
    websiteUrl: "https://www.dufart.sk/",
    podjestName: "Reštaurácia Dufart",
    order: 5,
  },
];

async function main() {
  for (const r of restaurants) {
    await prisma.restaurant.upsert({
      where: { podjestName: r.podjestName },
      update: { name: r.name, address: r.address, websiteUrl: r.websiteUrl, order: r.order },
      create: r,
    });
  }
  console.log(`Seeded ${restaurants.length} restaurants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
