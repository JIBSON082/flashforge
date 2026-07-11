import { NextRequest, NextResponse } from "next/server";
import officeParser from "officeparser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const allowed = [".pdf", ".pptx", ".ppt", ".docx", ".doc", ".odp", ".odt"];
    const name = file.name.toLowerCase();
    if (!allowed.some((ext) => name.endsWith(ext))) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, PPTX, or DOCX." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await officeParser.parseOfficeAsync(buffer, {
      newlineDelimiter: "\n",
      ignoreNotes: false,
    });

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Couldn't find readable text in that file. Try a different one." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, fileName: file.name });
  } catch (err: any) {
    console.error("Extract error:", err);
    return NextResponse.json(
      { error: "Something went wrong reading that file. Try again." },
      { status: 500 }
    );
  }
}

