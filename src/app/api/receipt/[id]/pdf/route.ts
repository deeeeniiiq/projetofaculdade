import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { getTransactionById } from "@/lib/transactions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const transaction = await getTransactionById(id);

  if (!transaction) {
    return new Response("Comprovante não encontrado.", { status: 404 });
  }

  const pdf = buildReceiptPdf(transaction);

  return new Response(pdf.data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comprovante-${pdf.code}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
