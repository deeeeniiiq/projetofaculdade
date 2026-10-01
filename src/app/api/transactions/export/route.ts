import { getTransactions } from "@/lib/transactions";
import { cashMovementCents } from "@/lib/card";
import { filterActivities, type ActivityMethod, type ActivityType } from "@/lib/activity-filters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") || "";
  const type = params.get("type") || "all";
  const method = params.get("method") || "all";
  const cutoff = Number(params.get("since") || 0);
  const minAmount = Number(params.get("min") || 0);
  const maxAmount = Number(params.get("max") || 0);
  if (!["all","receita","despesa"].includes(type) || !["all","PIX","Carteira","Cartão","Outros"].includes(method) || !Number.isFinite(cutoff) || cutoff < 0 || !Number.isFinite(minAmount) || minAmount < 0 || !Number.isFinite(maxAmount) || maxAmount < 0 || (maxAmount > 0 && minAmount > maxAmount)) return new Response("Filtro inválido.", {status:400});
  const transactions = filterActivities(await getTransactions(), { query, type: type as ActivityType, method: method as ActivityMethod, since: cutoff, minAmount, maxAmount });
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"','""') + '"';
  };
  const rows = [["Data","Pessoa","Destino","Tipo","Valor BRL","Impacto no saldo BRL","Método","Categoria","Mensagem","Status","ID"], ...transactions.map(t=>[t.criado_em,t.destinatario || t.descricao,t.identificador,t.tipo,t.valor.toFixed(2).replace(".",","),(cashMovementCents(t)/100).toFixed(2).replace(".",","),t.metodo,t.categoria,t.mensagem,t.status,t.id])];
  return new Response("\uFEFF"+rows.map(row=>row.map(cell).join(";")).join("\r\n"), {
    headers: {"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="saldo-extrato.csv"',"Cache-Control":"private, no-store"},
  });
}
