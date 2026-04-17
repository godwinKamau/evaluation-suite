import { NextResponse } from "next/server";
import { uploadExperimentToLangSmith } from "@/lib/langsmith";
import type { UploadRequestBody } from "@/types";

export async function POST(request: Request) {
  if (!process.env.LANGSMITH_API_KEY) {
    return NextResponse.json(
      { error: "LANGSMITH_API_KEY is not set in the environment." },
      { status: 500 },
    );
  }

  let body: UploadRequestBody;
  try {
    body = (await request.json()) as UploadRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { experimentName, results, activeMetrics } = body;
  if (!experimentName?.trim()) {
    return NextResponse.json(
      { error: "experimentName is required." },
      { status: 400 },
    );
  }
  if (!results?.length) {
    return NextResponse.json(
      { error: "No results to upload." },
      { status: 400 },
    );
  }

  try {
    const upload = await uploadExperimentToLangSmith({
      experimentName: experimentName.trim(),
      results,
      activeMetrics,
    });
    return NextResponse.json({ ok: true, ...upload });
  } catch (e) {
    const message = e instanceof Error ? e.message : "LangSmith upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
