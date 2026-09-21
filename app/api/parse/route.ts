import { NextRequest, NextResponse } from "next/server";
import { parseBankExport } from "@/lib/bankParser";
import { parseLookupWorkbook } from "@/lib/lookupParser";
import { matchSuppliers } from "@/lib/match";
import { renderSupplierPdf } from "@/lib/pdf";
import type { MatchedSupplier, ParseResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const bankFile = formData.get("bankFile");
  const lookupFile = formData.get("lookupFile");

  if (!(bankFile instanceof File) || !(lookupFile instanceof File)) {
    return NextResponse.json(
      { error: "Both bankFile and lookupFile are required." },
      { status: 400 }
    );
  }

  const bankBuffer = Buffer.from(await bankFile.arrayBuffer());
  const lookupBuffer = Buffer.from(await lookupFile.arrayBuffer());

  const { blocks, warnings } = parseBankExport(bankBuffer);
  if (blocks.length === 0) {
    return NextResponse.json(
      {
        error:
          "No supplier blocks were found in the bank export. Check that this is the raw .txt EFT remittance detail file (UTF-16), not a converted copy.",
      },
      { status: 422 }
    );
  }

  const lookup = parseLookupWorkbook(lookupBuffer);
  const matched = matchSuppliers(blocks, lookup);

  const suppliers: MatchedSupplier[] = [];
  for (const supplier of matched) {
    const pdfBuffer = await renderSupplierPdf(supplier as MatchedSupplier);
    suppliers.push({ ...supplier, pdfBase64: pdfBuffer.toString("base64") });
  }

  const result: ParseResult = { suppliers, warnings };
  return NextResponse.json(result);
}
