import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDisplayMenu } from "@/lib/menuDisplay";

export async function GET() {
  const restaurants = await prisma.restaurant.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  const result = await Promise.all(
    restaurants.map(async (r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      websiteUrl: r.websiteUrl,
      menu: await resolveDisplayMenu(r.id),
    }))
  );

  return NextResponse.json(result);
}
