import { NextResponse } from "next/server";
import { getRecentPositions } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const positions = await getRecentPositions(id, 50);
    return NextResponse.json({ data: positions });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
