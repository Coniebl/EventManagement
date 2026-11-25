import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("rpc_get_public_event", {
      p_event_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load event.", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ event: data });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Server error.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
