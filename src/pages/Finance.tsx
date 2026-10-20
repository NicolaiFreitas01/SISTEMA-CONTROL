import { useState, type FormEvent } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useStore } from "../lib/store";
import { metrics, money, today, uid, type Entry } from "../lib/domain";
import { Button, Field, Modal, Badge, Empty } from "../components/ui";
import { CompareChart } from "../components/charts";
import { Simulator } from "./Simulator";
export function Finance({ from, to }: { from: string; to: string }) {
  const { data, commit, busy } = useStore(),
    [tab, setTab] = useState("cash"),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState({
      date: today(),
      kind: "expense" as Entry["kind"],
      category: "Ferramentas",
      description: "",
      amount: 0,
      recurring: false,
    });
  const m = metrics(data, from, to),
    entries = data.entries.filter((e) => e.date >= from && e.date <= to),
    traffic = data.traffic.filter((e) => e.date >= from && e.date <= to);
  const dates = [
    ...new Set([...entries.map((e) => e.date), ...traffic.map((e) => e.date)]),
  ].sort();
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (draft.amount <= 0 || !draft.description.trim())
        throw new Error("Informe descrição e valor positivo.");
      await commit({
        ...data,
        entries: [...data.entries, { ...draft, id: uid() }],
      });
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CADA REAL, NO LUGAR CERTO</div>
          <h1>
            Financeiro<span className="title-dot">.</span>
          </h1>
          <p>
            Recebimentos confirmados, compromissos registrados e projeções
            distintas.
          </p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={16} /> Lançamento
        </Button>
      </div>
      <div className="tabs">
        {[
          ["cash", "Fluxo de caixa"],
          ["result", "Resultado operacional"],
          ["calendar", "Calendário financeiro"],
          ["projection", "Projeção"],
        ].map(([k, l]) => (
          <button
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
            key={k}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "projection" ? (
        <Simulator />
      ) : (
        <>
          <div className="stats-grid four">
            {[
              ["Entradas confirmadas", m.revenue],
              ["Saídas confirmadas", m.cost + m.ads + m.expenses + m.refunds],
              ["Resultado operacional", m.operating],
              ["Resultado líquido", m.net],
            ].map(([l, v]) => (
              <div className="stat-card" key={l}>
                <div className="stat-top">{l}</div>
                <div
                  className={`stat-value ${Number(v) < 0 ? "negative" : ""}`}
                >
                  {money(Number(v))}
                </div>
              </div>
            ))}
          </div>
          {tab === "result" ? (
            <section className="panel">
              <h2>Demonstrativo do período</h2>
              <div className="result-lines">
                {[
                  ["(+) Fretes antecipados", m.shipping],
                  ["(+) Produtos pagos", m.product],
                  ["(+) Outras entradas", m.revenue - m.shipping - m.product],
                  ["(−) Produto + envio", -m.cost],
                  ["(−) Tráfego real", -m.ads],
                  [
                    "(−) Outras despesas e estornos",
                    -(m.expenses + m.refunds - (m.preTax - m.net)),
                  ],
                  ["(−) Impostos e taxas financeiras", -(m.preTax - m.net)],
                  ["(=) Resultado operacional estimado", m.operating],
                  ["(=) Resultado líquido gerencial", m.net],
                ].map(([l, v]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <strong
                      className={Number(v) < 0 ? "negative" : "positive-text"}
                    >
                      {money(Number(v))}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="micro">
                Apuração gerencial com receitas efetivamente recebidas e custos
                nos despachos. O resultado operacional inclui todos os custos,
                despesas, tributos e estornos registrados. O líquido gerencial
                coincide com ele enquanto não houver ajustes contábeis
                adicionais. Não substitui escrituração contábil.
              </p>
            </section>
          ) : tab === "calendar" ? (
            <section className="panel">
              <h2>Calendário de movimentos efetivos</h2>
              {dates.length ? (
                <div className="calendar-grid">
                  {dates.map((date) => {
                    const v = metrics(data, date, date);
                    return (
                      <article className="calendar-day" key={date}>
                        <h3>{date.split("-").reverse().join("/")}</h3>
                        <p className="positive-text">
                          Entradas {money(v.revenue)}
                        </p>
                        <p className="negative">
                          Saídas{" "}
                          {money(v.cost + v.ads + v.expenses + v.refunds)}
                        </p>
                        <strong>Saldo {money(v.net)}</strong>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty />
              )}
            </section>
          ) : (
            <>
              <section className="panel">
                <h2>Entradas e saídas diárias</h2>
                <CompareChart
                  data={dates.map((date) => {
                    const v = metrics(data, date, date);
                    return {
                      label: date.slice(5),
                      revenue: v.revenue,
                      expense: v.cost + v.ads + v.expenses + v.refunds,
                    };
                  })}
                />
              </section>
              <section className="panel">
                <h2>Livro de movimentações</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>DATA</th>
                        <th>DESCRIÇÃO</th>
                        <th>CATEGORIA</th>
                        <th>TIPO</th>
                        <th>VALOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...entries.map((e) => ({
                          ...e,
                          positive: ["shipping", "product", "income"].includes(
                            e.kind,
                          ),
                        })),
                        ...traffic.map((t) => ({
                          id: t.id,
                          date: t.date,
                          description:
                            "Tráfego · " +
                            data.adsets.find((a) => a.id === t.adsetId)?.name,
                          category: "Meta Ads",
                          amount: t.spend,
                          positive: false,
                          recurring: false,
                        })),
                      ]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.date}</td>
                            <td>{e.description}</td>
                            <td>
                              {e.category} {e.recurring && <Badge>Fixa</Badge>}
                            </td>
                            <td>{e.positive ? "Entrada" : "Saída"}</td>
                            <td
                              className={
                                e.positive ? "positive-text" : "negative"
                              }
                            >
                              {e.positive ? "+" : "−"} {money(e.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="micro">
                  Despesas fixas identificadas não são repetidas
                  automaticamente. Registre cada ocorrência real. Lançamentos
                  financeiros são imutáveis; use estornos de pedidos para
                  reembolsos.
                </p>
              </section>
            </>
          )}
        </>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo lançamento financeiro"
      >
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="Tipo">
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({ ...draft, kind: e.target.value as Entry["kind"] })
                }
              >
                <option value="expense">Despesa</option>
                <option value="income">Outra entrada</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                {[
                  "Ferramentas",
                  "Impostos",
                  "Taxas financeiras",
                  "Devoluções",
                  "Reentregas",
                  "Outras despesas",
                  "Outras entradas",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Data efetiva">
              <input
                required
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                required
                type="number"
                min=".01"
                step=".01"
                value={draft.amount}
                onChange={(e) =>
                  setDraft({ ...draft, amount: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Descrição">
            <input
              required
              maxLength={250}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={(e) =>
                setDraft({ ...draft, recurring: e.target.checked })
              }
            />{" "}
            Despesa fixa (cada ocorrência deve ser registrada)
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button disabled={busy}>Confirmar lançamento</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
