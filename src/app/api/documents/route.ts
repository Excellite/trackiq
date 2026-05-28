import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const truckId = searchParams.get("truck_id");

    let query = supabase
      .from("vehicle_documents")
      .select("*")
      .order("expiry_date", { ascending: true });

    if (truckId) query = query.eq("truck_id", truckId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { truck_id, doc_type, doc_number, issued_date, expiry_date, notes } = body;

    if (!truck_id || !doc_type || !expiry_date) {
      return NextResponse.json(
        { error: "truck_id, doc_type, and expiry_date are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("vehicle_documents")
      .insert({ truck_id, doc_type, doc_number, issued_date, expiry_date, notes })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
