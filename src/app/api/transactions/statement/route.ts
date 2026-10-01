import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/transactions";
import { buildStatementPdf } from "@/lib/statement-pdf";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Informe um mês válido no formato AAAA-MM." }, { status: 400 });
  try {
    const data = buildStatementPdf(await getTransactions(), month);
    return new Response(data as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="extrato-saldo-${month}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível gerar o extrato." }, { status: 503 }); }
}
