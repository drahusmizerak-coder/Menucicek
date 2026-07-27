import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const restaurants = await prisma.restaurant.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(restaurants);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const podjestName: string | undefined = body.podjestName;
  if (!podjestName) {
    return NextResponse.json({ error: "podjestName is required" }, { status: 400 });
  }

  const maxOrder = await prisma.restaurant.aggregate({ _max: { order: true } });

  try {
    const restaurant = await prisma.restaurant.create({
      data: {
        podjestName,
        name: body.name || podjestName,
        address: body.address || null,
        websiteUrl: body.websiteUrl || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    return NextResponse.json(restaurant, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Restaurant already tracked" }, { status: 409 });
  }
}
