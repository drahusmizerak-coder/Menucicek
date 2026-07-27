import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAllMenus } from "@/lib/podjest";

// Restaurant names from podjest.sk that aren't tracked yet - used by the
// "Pridať reštauráciu" flow (v1 scope: pick from podjest.sk's list, see plan).
export async function GET() {
  const [all, tracked] = await Promise.all([
    fetchAllMenus(),
    prisma.restaurant.findMany({ select: { podjestName: true } }),
  ]);

  const trackedNames = new Set(tracked.map((r) => r.podjestName));
  const available = all
    .map((r) => r.name)
    .filter((name) => !trackedNames.has(name))
    .sort((a, b) => a.localeCompare(b, "sk"));

  return NextResponse.json(available);
}
