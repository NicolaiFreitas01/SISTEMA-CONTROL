import { useState } from "react";
import { Calculator, ArrowUpRight, FlaskConical } from "lucide-react";
import { useStore } from "../lib/store";
import { simulate, money, type Simulation } from "../lib/domain";
import { Field, Badge, Button } from "../components/ui";
import { CompareChart } from "../components/charts";
export function Simulator() {
  const { data } = useStore(),
    s = data.settings;
  const [x, setX] = useState<Simulation>({
    orders: 10,
    deliveryRate: 80,
    price: s.price,
    shipping: s.shipping,
    cost: s.cost,
    sets: s.sets,
    budget: s.budget,
    days: 30,
    cpa: 8,
    expenses: 0,
    inverse: false,
  });
  const r = simulate(x),
    set = (k: keyof Simulation, v: unknown) => setX((x) => ({ ...x, [k]: v }));
  const fields: [keyof Simulation, string, number, number, number][] = [
    ["orders", "Pedidos com frete pago / dia", 0, 500, 1],
    ["deliveryRate", "Taxa de entrega paga (%)", 0, 100, 1],
    ["price", "Produto na entrega (R$)", 0, 1000, 0.01],
    ["shipping", "Frete antecipado (R$)", 0, 200, 0.01],
    ["cost", "Custo por unidade com envio (R$)", 0, 300, 0.01],
    ["sets", "Conjuntos ativos", 0, 50, 1],
    ["budget", "Orçamento por conjunto / dia (R$)", 0, 1000, 0.01],
    ["days", "Dias de operação", 1, 366, 1],
    ["cpa", "CPA estimado (R$)", 0.01, 500, 0.01],
    ["expenses", "Outras despesas / dia (R$)", 0, 1000, 0.01],
  ];
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">PLANEJE O PRÓXIMO PASSO</div>
          <h1>
            Simulador de lucro<span className="title-dot">.</span>
          </h1>
          <p>Teste hipóteses antes de investir. Projeções não são garantias.</p>
        </div>
        <Badge tone="warning">
          <FlaskConical size={13} /> Projeção
        </Badge>
      </div>
      <div className="sim-layout">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Construa seu cenário</h2>
              <p>Um produto por pedido nesta simulação</p>
            </div>
            <Calculator size={20} />
          </div>
          <div className="segmented">
            <button
              className={!x.inverse ? "active" : ""}
              onClick={() => set("inverse", false)}
            >
              Por pedidos
            </button>
            <button
              className={x.inverse ? "active" : ""}
              onClick={() => set("inverse", true)}
            >
              Por investimento / CPA
            </button>
          </div>
          <div className="form-grid">
            {fields
              .filter(
                ([k]) =>
                  !(x.inverse && k === "orders") &&
                  !(!x.inverse && k === "cpa"),
              )
              .map(([k, label, min, max, step]) => (
                <Field label={label} key={k}>
                  <div className="slider-label">
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={Number(x[k])}
                      onChange={(e) =>
                        set(
                          k,
                          Math.min(max, Math.max(min, Number(e.target.value))),
                        )
                      }
                    />
                  </div>
                  <input
                    aria-label={`${label} controle`}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={Number(x[k])}
                    onChange={(e) => set(k, Number(e.target.value))}
                  />
                </Field>
              ))}
          </div>
          <p className="micro">
            Todos os pedidos simulados têm frete pago e são enviados. Entregas
            não pagas conservam o custo de envio. No modo inverso, pedidos =
            orçamento total ÷ CPA.
          </p>
        </section>
        <section className="panel sim-result">
          <Badge tone="positive">SEU CENÁRIO ESTIMADO</Badge>
          <p>Resultado operacional em {x.days} dias</p>
          <h2 className={r.monthly < 0 ? "negative" : ""}>
            {money(r.monthly)}
          </h2>
          <span className="sim-margin">
            {r.margin.toFixed(1)}% de margem estimada
          </span>
          <div className="result-lines">
            {[
              ["Receita diária", money(r.revenue)],
              ["Receita no período", money(r.monthlyRevenue)],
              ["Anúncios / dia", money(r.ads)],
              ["Anúncios no período", money(r.ads * x.days)],
              ["Produto + envio no período", money(r.cost * x.days)],
              ["Outras despesas no período", money(x.expenses * x.days)],
              ["Pedidos no período", r.totalOrders.toFixed(1)],
              ["Entregas pagas no período", r.totalPaid.toFixed(1)],
              ["Resultado por dia", money(r.profit)],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="notice">
            <ArrowUpRight size={18} /> Frete recebido cobre o custo padrão do
            envio. O produto só vira receita quando pago.
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Uma decisão. Três perspectivas.</h2>
            <p>Mesmos custos e investimento; taxas de entrega variáveis</p>
          </div>
        </div>
        <div className="scenario-grid">
          {[
            ["Conservador", Math.max(0, x.deliveryRate - 20)],
            ["Base", x.deliveryRate],
            ["Otimista", Math.min(100, x.deliveryRate + 15)],
          ].map(([label, rate]) => {
            const v = simulate({ ...x, deliveryRate: Number(rate) });
            return (
              <article className="scenario" key={label}>
                <Badge>{label}</Badge>
                <p>{rate}% de entregas pagas</p>
                <h2 className={v.monthly >= 0 ? "positive-text" : "negative"}>
                  {money(v.monthly)}
                </h2>
                <span>Resultado em {x.days} dias</span>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
