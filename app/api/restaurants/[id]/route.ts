import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.address === "string" ? { address: body.address } : {}),
      ...(typeof body.websiteUrl === "string" ? { websiteUrl: body.websiteUrl } : {}),
    },
  });

  return NextResponse.json(restaurant);
}
