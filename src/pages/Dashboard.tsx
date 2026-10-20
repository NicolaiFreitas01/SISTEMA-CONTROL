import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  MousePointer2,
  Truck,
  PackageCheck,
  Receipt,
  Target,
  Percent,
  Plus,
  ArrowRight,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
  eachMonthOfInterval,
  startOfWeek,
} from "date-fns";
import { useStore } from "../lib/store";
import { metrics, money, ratio, today } from "../lib/domain";
import { Badge, Button, Empty } from "../components/ui";
import { RevenueChart, CompareChart } from "../components/charts";
export function Dashboard({
  from,
  to,
  navigate,
  onNew,
}: {
  from: string;
  to: string;
  navigate: (p: string) => void;
  onNew: () => void;
}) {
  const { data } = useStore(),
    m = metrics(data, from, to);
  const previous = metrics(
    data,
    format(
      subDays(
        parseISO(from),
        Math.max(
          1,
          Math.round((+parseISO(to) - +parseISO(from)) / 86400000) + 1,
        ),
      ),
      "yyyy-MM-dd",
    ),
    format(subDays(parseISO(from), 1), "yyyy-MM-dd"),
  );
  const diff = previous.revenue
    ? ((m.revenue - previous.revenue) / previous.revenue) * 100
    : null;
  let days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  if (days.length > 93)
    days = days.filter((_, i) => i % Math.ceil(days.length / 90) === 0);
  const chart = days.map((d) => {
    const dt = format(d, "yyyy-MM-dd"),
      v = metrics(data, dt, dt);
    return {
      label: format(d, "dd/MM"),
      revenue: v.revenue,
      net: v.net,
      expense: v.cost + v.ads + v.expenses + v.refunds,
      ads: v.ads,
      orders: v.orders,
      paid: v.paid,
      cpa: v.cpa,
    };
  });
  const cards = [
    {
      title: "Faturamento recebido",
      value: money(m.revenue),
      hint:
        diff === null
          ? "Recebimentos confirmados"
          : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% vs. período anterior`,
      icon: Wallet,
      main: true,
    },
    {
      title: "Resultado operacional",
      value: money(m.operating),
      hint: "Após despesas e estornos registrados",
      icon: TrendingUp,
      main: true,
    },
    {
      title: "Investimento em tráfego",
      value: money(m.ads),
      hint: "Gasto real, não o orçamento",
      icon: MousePointer2,
    },
    {
      title: "Fretes recebidos",
      value: money(m.shipping),
      hint: `${m.shippingOrders} pagamentos confirmados`,
      icon: Truck,
    },
    {
      title: "Pedidos enviados",
      value: String(m.sent).padStart(2, "0"),
      hint: money(m.cost) + " em produto + envio",
      icon: Receipt,
    },
    {
      title: "Entregas pagas",
      value: String(m.paid).padStart(2, "0"),
      hint: `${m.deliveryRate.toFixed(1)}% dos envios no período`,
      icon: PackageCheck,
    },
    {
      title: "CPA por frete pago",
      value: money(m.cpa),
      hint: m.shippingOrders
        ? "Investimento ÷ fretes pagos"
        : "Aguardando conversões",
      icon: Target,
    },
    {
      title: "Margem líquida",
      value: `${m.margin.toFixed(1)}%`,
      hint: "Resultado líquido ÷ receita",
      icon: Percent,
    },
  ];
  const monthly = eachMonthOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  }).map((d) => {
    const prefix = format(d, "yyyy-MM"),
      filtered = {
        ...data,
        entries: data.entries.filter((e) => e.date.startsWith(prefix)),
        traffic: data.traffic.filter((t) => t.date.startsWith(prefix)),
      },
      v = metrics(filtered, from, to);
    return {
      label: format(d, "MM/yyyy"),
      revenue: v.revenue,
      expense: v.cost + v.ads + v.expenses + v.refunds,
    };
  });
  const weekKeys = [
    ...new Set(
      days.map((d) =>
        format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      ),
    ),
  ];
  const weekly = weekKeys.map((w) => {
    const end = format(subDays(parseISO(w), -6), "yyyy-MM-dd"),
      v = metrics(data, w > from ? w : from, end < to ? end : to);
    return {
      label: format(parseISO(w), "dd/MM"),
      revenue: v.revenue,
      expense: v.cost + v.ads + v.expenses + v.refunds,
    };
  });
  const ranked = data.adsets
    .map((a) => ({ ...a, m: metrics(data, from, to, a.id) }))
    .sort((a, b) => b.m.net - a.m.net);
  const alerts: string[] = [];
  if (m.net < 0)
    alerts.push(`Resultado negativo de ${money(Math.abs(m.net))} no período.`);
  if (m.cpa > data.settings.cpaAlert)
    alerts.push(`CPA acima de ${money(data.settings.cpaAlert)}.`);
  const delayed = data.orders.filter(
    (o) =>
      ["Enviado", "Em transporte"].includes(o.status) &&
      (+parseISO(today()) - +parseISO(o.date)) / 86400000 >
        data.settings.lateDays,
  ).length;
  if (delayed)
    alerts.push(
      `${delayed} pedidos enviados há mais de ${data.settings.lateDays} dias. Verifique o rastreamento.`,
    );
  const returns = data.orders.filter(
    (o) =>
      o.date >= from &&
      o.date <= to &&
      ["Devolvido", "Recusado"].includes(o.status),
  ).length;
  if (ratio(returns, m.orders) * 100 > data.settings.returnAlert)
    alerts.push("Taxa de recusas/devoluções acima do limite configurado.");
  if (
    m.ads >
    data.adsets.filter((a) => a.active).reduce((s, a) => s + a.budget, 0) *
      eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).length
  )
    alerts.push("Gasto real maior que o orçamento planejado.");
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">SEU NEGÓCIO, EM PERSPECTIVA</div>
          <h1>
            Visão geral<span className="title-dot">.</span>
          </h1>
          <p>
            Acompanhe os números. Entenda os resultados. Cresça com clareza.
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus size={16} /> Novo pedido
        </Button>
      </div>
      <div className="stats-grid">
        {cards.map((c) => (
          <article
            className={`stat-card ${c.main ? "highlight" : ""}`}
            key={c.title}
          >
            <div className="stat-top">
              <span>{c.title}</span>
              <c.icon size={17} />
            </div>
            <div
              className={
                c.title.includes("Resultado") && m.operating < 0
                  ? "stat-value negative"
                  : "stat-value"
              }
            >
              {c.value}
            </div>
            <div className="stat-hint">
              {c.main && <span className="mini-dot" />}
              {c.hint}
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-row">
        <section className="panel revenue-panel">
          <div className="panel-title">
            <div>
              <h2>Evolução financeira</h2>
              <p>Receita recebida e resultado líquido no período</p>
            </div>
            <Badge tone="positive">
              <span className="mini-dot" /> Fluxo real
            </Badge>
          </div>
          <div className="chart-summary">
            <strong>{money(m.revenue)}</strong>
            <span>
              <i className="legend-dot" /> Receita{" "}
              <i className="legend-dot muted" /> Resultado líquido
            </span>
          </div>
          <RevenueChart data={chart} />
        </section>
        <section className="panel operation">
          <div className="panel-title">
            <div>
              <h2>Sua operação COD</h2>
              <p>Do primeiro pedido ao dinheiro em caixa</p>
            </div>
            <PackageCheck size={19} />
          </div>
          {[
            { label: "Pedidos realizados", value: m.orders, icon: Receipt },
            {
              label: "Fretes confirmados",
              value: m.shippingOrders,
              icon: Wallet,
            },
            { label: "Pedidos enviados", value: m.sent, icon: Truck },
            { label: "Entregues e pagos", value: m.paid, icon: PackageCheck },
          ].map((x, i) => (
            <div className="op-row" key={x.label}>
              <span className="op-icon">
                <x.icon size={17} />
              </span>
              <div>
                <span>{x.label}</span>
                <div className="progress">
                  <i
                    style={{
                      width: `${Math.min(100, ratio(x.value, m.orders) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <strong>{String(x.value).padStart(2, "0")}</strong>
              <small>0{i + 1}</small>
            </div>
          ))}
          <div className="op-bottom">
            <span>Conversão de pedidos em pagamentos</span>
            <strong>
              {(ratio(m.paid, m.orders) * 100).toFixed(1)}%{" "}
              <ArrowUpRight size={15} />
            </strong>
          </div>
          <p className="micro">
            Eventos do período; pagamentos podem se referir a pedidos
            anteriores.
          </p>
        </section>
      </div>
      <div className="dashboard-row lower">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Performance dos conjuntos</h2>
              <p>Resultados atribuídos aos seus anúncios</p>
            </div>
            <Button variant="ghost" onClick={() => navigate("traffic")}>
              Ver tráfego <ArrowRight size={14} />
            </Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CONJUNTO</th>
                  <th>GASTO REAL</th>
                  <th>FRETES PAGOS</th>
                  <th>CPA</th>
                  <th>RESULTADO LÍQUIDO</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((a, i) => (
                  <tr key={a.id}>
                    <td>
                      <span className="rank">0{i + 1}</span> {a.name}{" "}
                      {i === 0 && a.m.paid > 0 && (
                        <Badge tone="positive">Destaque</Badge>
                      )}
                    </td>
                    <td>{money(a.m.ads)}</td>
                    <td>{a.m.shippingOrders}</td>
                    <td>{money(a.m.cpa)}</td>
                    <td className={a.m.net >= 0 ? "positive-text" : "negative"}>
                      {money(a.m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            ROAS geral <strong>{m.roas.toFixed(2)}x</strong> · Receita atribuída
            / gasto real
          </p>
        </section>
        <section className="panel insights">
          <div className="panel-title">
            <div>
              <h2>
                <ChartNoAxesCombined size={18} /> Radar do negócio
              </h2>
              <p>Seus dados transformados em direção</p>
            </div>
            <Badge>Regras locais</Badge>
          </div>
          {alerts.length ? (
            alerts.slice(0, 3).map((a) => (
              <div className="insight" key={a}>
                <ArrowUpRight size={16} />
                <p>{a}</p>
              </div>
            ))
          ) : (
            <div className="insight">
              <ArrowUpRight size={16} />
              <p>
                {m.orders
                  ? "Nenhum alerta configurado foi acionado. Continue acompanhando seus pagamentos."
                  : "Registre pedidos, pagamentos e gastos reais para começar a acompanhar sua rentabilidade."}
              </p>
            </div>
          )}
          <Button variant="ghost" onClick={() => navigate("ai")}>
            Abrir analista <ArrowRight size={14} />
          </Button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Últimos pedidos</h2>
            <p>Uma visão rápida das movimentações recentes</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("orders")}>
            Todos os pedidos <ArrowRight size={14} />
          </Button>
        </div>
        {data.orders.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CLIENTE</th>
                  <th>DATA</th>
                  <th>LOCALIZAÇÃO</th>
                  <th>VALOR TOTAL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.orders
                  .slice(-5)
                  .reverse()
                  .map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="avatar">{o.name[0]}</span>
                        {o.name}
                      </td>
                      <td>{o.date.split("-").reverse().join("/")}</td>
                      <td>
                        {o.city} / {o.state}
                      </td>
                      <td>{money(o.price * o.quantity + o.shipping)}</td>
                      <td>
                        <Badge
                          tone={
                            o.status === "Entregue e pago"
                              ? "positive"
                              : "neutral"
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Cadastre seu primeiro pedido para acompanhar a operação." />
        )}
      </section>
      <details className="panel extra-charts">
        <summary>Explorar comparativos e indicadores diários</summary>
        <div className="two-col">
          <div>
            <h3>Receita versus despesas</h3>
            <CompareChart data={chart} />
          </div>
          <div>
            <h3>Pedidos versus entregas pagas</h3>
            <CompareChart
              data={chart}
              keys={[
                ["orders", "Pedidos"],
                ["paid", "Entregas pagas"],
              ]}
            />
          </div>
          <div>
            <h3>Investimento e CPA diários</h3>
            <CompareChart
              data={chart}
              keys={[
                ["ads", "Investimento"],
                ["cpa", "CPA"],
              ]}
            />
          </div>
          <div>
            <h3>Evolução mensal do faturamento</h3>
            <CompareChart data={monthly} />
          </div>
          <div>
            <h3>Comparativo semanal</h3>
            <CompareChart data={weekly} />
          </div>
          <div>
            <h3>Comparativo por conjunto</h3>
            <CompareChart
              data={ranked.map((a) => ({
                label: a.name,
                revenue: a.m.revenue,
                expense: a.m.ads + a.m.cost + a.m.expenses + a.m.refunds,
              }))}
            />
          </div>
        </div>
      </details>
    </>
  );
}
