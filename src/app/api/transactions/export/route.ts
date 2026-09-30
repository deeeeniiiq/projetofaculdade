import { getTransactions } from "@/lib/transactions";
import { cashMovementCents } from "@/lib/card";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const type = params.get("type") || "all";
  const cutoff = Number(params.get("since") || 0);
  if (!["all","receita","despesa"].includes(type) || !Number.isFinite(cutoff) || cutoff < 0) return new Response("Filtro inválido.", {status:400});
  const transactions = (await getTransactions()).filter(t => {
    const haystack = [t.descricao,t.destinatario,t.identificador,t.mensagem,t.categoria,t.metodo].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    return (type==="all" || t.tipo===type) && new Date(t.criado_em).getTime() >= cutoff && haystack.includes(query);
  });
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
