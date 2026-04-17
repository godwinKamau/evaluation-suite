import { NextResponse } from "next/server";
import type { OpenRouterModelOption } from "@/types";

const MODELS_URL = "https://openrouter.ai/api/v1/models";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set in the environment." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          error: `OpenRouter models request failed (${res.status}): ${errText.slice(0, 500)}`,
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        description?: string;
        top_provider?: { name?: string };
      }>;
    };

    const models: OpenRouterModelOption[] = (data.data ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      provider: m.top_provider?.name,
      description: m.description,
    }));

    models.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ models });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch models: ${message}` },
      { status: 500 },
    );
  }
}
