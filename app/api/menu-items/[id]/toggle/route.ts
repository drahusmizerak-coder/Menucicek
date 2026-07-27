import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      checked: !item.checked,
      checkedAt: !item.checked ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: updated.id,
    checked: updated.checked,
  });
}
