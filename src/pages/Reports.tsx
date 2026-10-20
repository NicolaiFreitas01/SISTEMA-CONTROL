import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowUpRight,
  Send,
} from "lucide-react";
import { startOfWeek, format, parseISO } from "date-fns";
import { useStore } from "../lib/store";
import { metrics, money, ratio } from "../lib/domain";
import { Button, Field, Badge } from "../components/ui";
import { exportRows } from "../lib/export";
import { CompareChart } from "../components/charts";
export function Reports({ from, to }: { from: string; to: string }) {
  const { data } = useStore(),
    [group, setGroup] = useState("daily"),
    [message, setMessage] = useState(""),
    m = metrics(data, from, to);
  const groups = new Map<string, Set<string>>();
  const orders = data.orders.filter((o) => o.date <= to);
  if (["adset", "creative", "city", "status"].includes(group)) {
    for (const o of orders) {
      const key =
        group === "adset"
          ? (data.adsets.find((a) => a.id === o.adsetId)?.name ??
            "Sem atribuição")
          : group === "creative"
            ? (data.creatives.find((c) => c.id === o.creativeId)?.name ??
              "Sem atribuição")
            : group === "city"
              ? `${o.city || "Não informada"} / ${o.state}`
              : o.status;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key)!.add(o.id);
    }
    if (group === "adset")
      for (const a of data.adsets)
        if (!groups.has(a.name)) groups.set(a.name, new Set());
    if (group === "creative")
      for (const c of data.creatives)
        if (!groups.has(c.name)) groups.set(c.name, new Set());
  } else {
    for (const date of [
      ...data.entries.map((e) => e.date),
      ...data.traffic.map((t) => t.date),
      ...data.orders.map((o) => o.date),
    ].filter((d) => d >= from && d <= to)) {
      const key =
        group === "monthly"
          ? date.slice(0, 7)
          : group === "weekly"
            ? format(
                startOfWeek(parseISO(date), { weekStartsOn: 1 }),
                "yyyy-MM-dd",
              )
            : date;
      if (!groups.has(key)) groups.set(key, new Set());
    }
  }
  const rows = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ids]) => {
      let d = data,
        f = from,
        t = to;
      if (["daily", "weekly", "monthly"].includes(group)) {
        const match = (date: string) =>
          group === "daily"
            ? date === name
            : group === "monthly"
              ? date.startsWith(name)
              : format(
                  startOfWeek(parseISO(date), { weekStartsOn: 1 }),
                  "yyyy-MM-dd",
                ) === name;
        d = {
          ...data,
          entries: data.entries.filter((e) => match(e.date)),
          traffic: data.traffic.filter((e) => match(e.date)),
          orders: data.orders.filter((o) => match(o.date)),
        };
      } else {
        const a = data.adsets.find((a) => a.name === name),
          c = data.creatives.find((c) => c.name === name);
        d = {
          ...data,
          orders: data.orders.filter((o) => ids.has(o.id)),
          entries: data.entries.filter(
            (e) =>
              (e.orderId && ids.has(e.orderId)) ||
              (group === "adset" && a && e.adsetId === a.id) ||
              (group === "creative" && c && e.creativeId === c.id),
          ),
          traffic: data.traffic.filter((e) =>
            group === "adset"
              ? e.adsetId === a?.id
              : group === "creative"
                ? e.creativeId === c?.id
                : false,
          ),
        };
      }
      const v = metrics(d, f, t);
      return {
        Grupo: name,
        Receita: v.revenue,
        Custos: v.cost,
        Anuncios: v.ads,
        Despesas: v.expenses + v.refunds,
        Resultado: v.net,
        CPA: v.cpa,
        ROAS: v.roas,
        Pedidos: v.orders,
        Entregas: v.paid,
        "Taxa entrega (%)": v.deliveryRate,
      };
    });
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `LABIRINEX CONTROL | ${from} a ${to}\nReceita recebida: ${money(m.revenue)}\nProduto + envio: ${money(m.cost)}\nTráfego real: ${money(m.ads)}\nOutras despesas e estornos: ${money(m.expenses + m.refunds)}\nResultado líquido: ${money(m.net)}\nFretes pagos: ${m.shippingOrders} | Entregas pagas: ${m.paid}\nCPA: ${money(m.cpa)} | ROAS: ${m.roas.toFixed(2)}x`,
      );
      setMessage("Resumo copiado. Você pode colar no WhatsApp.");
    } catch {
      setMessage("O navegador não permitiu copiar. Exporte o relatório.");
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">INFORMAÇÃO PARA DECIDIR</div>
          <h1>
            Relatórios<span className="title-dot">.</span>
          </h1>
          <p>Resultados reais, organizados na perspectiva que você precisa.</p>
        </div>
        <Button variant="outline" onClick={copy}>
          <Copy size={15} /> Copiar resumo
        </Button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <Field label="Agrupar por">
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {[
                ["daily", "Dia"],
                ["weekly", "Semana"],
                ["monthly", "Mês"],
                ["adset", "Conjunto"],
                ["creative", "Criativo"],
                ["city", "Cidade"],
                ["status", "Status atual"],
              ].map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div className="export-actions">
            {(["csv", "xlsx", "pdf"] as const).map((type) => (
              <Button
                variant="outline"
                key={type}
                onClick={async () => {
                  try {
                    await exportRows(rows, type);
                    setMessage("Relatório exportado.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                <Download size={15} />
                {type === "xlsx" ? "Excel" : type.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        {message && <p role="status">{message}</p>}
        <p className="micro">
          Por cidade/status, anúncios não são rateados sem atribuição
          comprovada; CPA e ROAS não se aplicam. Status é o atual, não um
          histórico do período. Receita considera a data dos pagamentos.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "GRUPO",
                  "RECEITA",
                  "CUSTOS",
                  "ANÚNCIOS",
                  "DESPESAS",
                  "RESULTADO",
                  "CPA",
                  "ROAS",
                  "PEDIDOS",
                  "ENTREGAS",
                  "TAXA ENTREGA",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.Grupo}>
                  <td>{r.Grupo}</td>
                  <td>{money(r.Receita)}</td>
                  <td>{money(r.Custos)}</td>
                  <td>{money(r.Anuncios)}</td>
                  <td>{money(r.Despesas)}</td>
                  <td
                    className={r.Resultado >= 0 ? "positive-text" : "negative"}
                  >
                    {money(r.Resultado)}
                  </td>
                  <td>
                    {["city", "status"].includes(group) ? "—" : money(r.CPA)}
                  </td>
                  <td>
                    {["city", "status"].includes(group)
                      ? "—"
                      : r.ROAS.toFixed(2) + "x"}
                  </td>
                  <td>{r.Pedidos}</td>
                  <td>{r.Entregas}</td>
                  <td>{r["Taxa entrega (%)"].toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Receita versus custos por agrupamento</h2>
        <CompareChart
          data={rows.map((r) => ({
            label: r.Grupo,
            revenue: r.Receita,
            expense: r.Custos + r.Anuncios + r.Despesas,
          }))}
        />
      </section>
    </>
  );
}
export function Analyst({ from, to }: { from: string; to: string }) {
  const { data } = useStore(),
    [question, setQuestion] = useState(""),
    [answers, setAnswers] = useState<{ question: string; answer: string }[]>(
      [],
    ),
    m = metrics(data, from, to);
  const top = [...data.adsets].sort(
    (a, b) =>
      metrics(data, from, to, b.id).paid - metrics(data, from, to, a.id).paid,
  )[0];
  const creative = data.creatives
    .map((c) => ({ c, m: metrics(data, from, to, c.adsetId, c.id) }))
    .filter((c) => c.m.shippingOrders >= 5)
    .sort((a, b) => a.m.cpa - b.m.cpa)[0];
  const facts = [
    {
      title: "Rentabilidade do período",
      body: `Receita confirmada de ${money(m.revenue)}, gasto em anúncios de ${money(m.ads)} e resultado líquido de ${money(m.net)}. ${m.revenue ? `Margem de ${m.margin.toFixed(1)}%.` : "Ainda não há receita para calcular margem."}`,
    },
    {
      title: "Aquisição e entregas",
      body: `${m.shippingOrders} fretes pagos e ${m.paid} entregas pagas. CPA de ${money(m.cpa)}. ${m.cpa > data.settings.cpaAlert ? "O CPA supera seu limite configurado. Revise atribuição e rentabilidade antes de aumentar orçamento." : "Avalie volume e resultado antes de escalar."}`,
    },
    {
      title: "Conjuntos e criativos",
      body:
        top && metrics(data, from, to, top.id).paid
          ? `${top.name} lidera em entregas pagas (${metrics(data, from, to, top.id).paid}). ${creative ? `${creative.c.name} tem o menor CPA entre criativos com ≥ 5 fretes pagos.` : "Nenhum criativo tem amostra mínima de cinco fretes pagos."}`
          : "Sem entregas pagas suficientes para apontar um conjunto vencedor.",
    },
  ];
  function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.toLowerCase();
    let answer = facts.map((f) => f.body).join("\n\n");
    if (q.includes("hoje")) {
      const date = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        }),
        v = metrics(data, date, date);
      answer = `Hoje (${date}), receita recebida: ${money(v.revenue)}; resultado operacional: ${money(v.operating)}; líquido: ${money(v.net)}. Todos os valores vêm de lançamentos registrados.`;
    } else if (q.includes("amanhã") || q.includes("investir"))
      answer = `Não é possível indicar investimento seguro apenas pelo lucro: faltam saldo inicial, reservas e compromissos futuros. O resultado líquido do período é ${money(m.net)}. Use o simulador por orçamento/CPA e preserve capital de giro; não há garantia de retorno.`;
    else if (q.includes("criativo")) answer = facts[2].body;
    else if (q.includes("30 mil") || q.includes("30000"))
      answer = `Hipótese de 100% de entregas pagas e sem anúncios/despesas adicionais: margem por pedido ${money(data.settings.price + data.settings.shipping - data.settings.cost)}; seriam necessárias ${Math.ceil(ratio(30000, data.settings.price + data.settings.shipping - data.settings.cost))} entregas. Para incluir anúncios e falhas de entrega, ajuste o simulador. Isso é projeção.`;
    else if (q.includes("conjunto")) answer = facts[2].body;
    else if (q.includes("lucr")) answer = facts[0].body;
    setAnswers([...answers, { question, answer }]);
    setQuestion("");
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CLAREZA PARA SUA PRÓXIMA DECISÃO</div>
          <h1>
            Analista IA Labirinex<span className="title-dot">.</span>
          </h1>
          <p>O que seus números mostram — com hipóteses transparentes.</p>
        </div>
        <Badge tone="warning">
          Análise determinística · modelo não conectado
        </Badge>
      </div>
      <div className="notice">
        <Sparkles size={18} /> As análises abaixo são regras locais e fórmulas,
        sem conexão com um modelo de IA. Perguntas livres usam temas
        reconhecidos e o resumo do período; não há interpretação generativa.
      </div>
      <div className="scenario-grid">
        {facts.map((f) => (
          <section className="panel" key={f.title}>
            <div className="insight-icon">
              <ArrowUpRight size={21} />
            </div>
            <h2>{f.title}</h2>
            <p>{f.body}</p>
          </section>
        ))}
      </div>
      <section className="panel analyst-chat">
        <div className="panel-title">
          <div>
            <h2>Consulte sua operação</h2>
            <p>
              Referência: {from} a {to}
            </p>
          </div>
          <Sparkles size={22} />
        </div>
        <div className="preset-buttons">
          {[
            "Quanto lucrei hoje?",
            "Qual conjunto trouxe mais vendas pagas?",
            "Quanto posso investir amanhã?",
            "Quantas entregas para lucrar R$ 30 mil?",
          ].map((q) => (
            <Button variant="outline" key={q} onClick={() => setQuestion(q)}>
              {q}
            </Button>
          ))}
        </div>
        {answers.map((a, i) => (
          <div className="answer" key={i}>
            <strong>{a.question}</strong>
            <p>{a.answer}</p>
            <Badge>Fórmulas locais · dados registrados</Badge>
          </div>
        ))}
        <form className="ask-form" onSubmit={ask}>
          <input
            aria-label="Pergunta para análise"
            placeholder="Pergunte sobre seus resultados..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button disabled={!question.trim()}>
            <Send size={16} /> Analisar
          </Button>
        </form>
      </section>
    </>
  );
}
