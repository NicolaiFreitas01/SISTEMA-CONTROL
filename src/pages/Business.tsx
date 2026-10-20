import { useState, type FormEvent } from "react";
import {
  Plus,
  ArrowRight,
  Check,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  metrics,
  money,
  today,
  uid,
  ratio,
  type Goal,
  type Settings,
} from "../lib/domain";
import { Button, Field, Modal, Badge, Empty } from "../components/ui";
export function Funnel({ from, to }: { from: string; to: string }) {
  const { data, commit, busy } = useStore(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState({
      label: "",
      date: today(),
      stage: 0,
      adsetId: "",
      creativeId: "",
    });
  const m = metrics(data, from, to),
    leads = data.leads.filter((l) => l.date >= from && l.date <= to);
  const stages = [
    "Conversa iniciada",
    "Atendido",
    "CEP informado",
    "Oferta enviada",
    "Pedido confirmado",
    "Frete pago",
    "Pedido enviado",
    "Entregue e pago",
  ];
  const values = stages.map((_, i) =>
    i < 5
      ? leads.filter((l) => l.stage >= i).length
      : i === 5
        ? m.shippingOrders
        : i === 6
          ? m.sent
          : m.paid,
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await commit({
        ...data,
        leads: [...data.leads, { ...draft, id: uid() }],
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
          <div className="eyebrow">CONVERSAS QUE VIRAM RESULTADO</div>
          <h1>
            Funil do WhatsApp<span className="title-dot">.</span>
          </h1>
          <p>Acompanhe o atendimento sem armazenar dados médicos.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Adicionar lead
        </Button>
      </div>
      <div className="notice">
        Etapas 1–5 vêm dos leads manuais; etapas 6–8 vêm dos eventos financeiros
        dos pedidos. Os grupos podem ter datas diferentes. WhatsApp não está
        conectado.
      </div>
      <section className="panel funnel">
        {stages.map((s, i) => (
          <div className="funnel-row" key={s}>
            <span className="funnel-number">0{i + 1}</span>
            <div
              className="funnel-bar"
              style={{ width: `${Math.max(25, 100 - i * 8)}%` }}
            >
              <span>{s}</span>
              <strong>{values[i]}</strong>
            </div>
            <div>
              <b>
                {i
                  ? `${(ratio(values[i], values[i - 1]) * 100).toFixed(1)}%`
                  : "100%"}
              </b>
              <small>
                {i
                  ? `${Math.max(0, (1 - ratio(values[i], values[i - 1])) * 100).toFixed(1)}% de abandono`
                  : "Início do funil"}
              </small>
            </div>
          </div>
        ))}
      </section>
      <div className="stats-grid four">
        {[
          ["CPA frete pago", money(m.cpa)],
          ["CPA entrega paga", money(m.deliveryCpa)],
          ["Taxa de entrega", m.deliveryRate.toFixed(1) + "%"],
          ["Receita por lead", money(ratio(m.revenue, values[0]))],
        ].map(([k, v]) => (
          <article className="stat-card" key={k}>
            <span>{k}</span>
            <h2>{v}</h2>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>Leads e movimentações</h2>
        <p className="micro">
          Use apenas um identificador comercial. Não registre informações de
          saúde.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>IDENTIFICADOR</th>
                <th>DATA</th>
                <th>ETAPA</th>
                <th>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.label || l.id.slice(0, 8)}</td>
                  <td>{l.date}</td>
                  <td>
                    <select
                      aria-label={`Etapa ${l.label}`}
                      value={l.stage}
                      disabled={busy}
                      onChange={async (e) => {
                        try {
                          await commit({
                            ...data,
                            leads: data.leads.map((x) =>
                              x.id === l.id
                                ? { ...x, stage: Number(e.target.value) }
                                : x,
                            ),
                          });
                        } catch {}
                      }}
                    >
                      {stages.slice(0, 5).map((s, i) => (
                        <option key={s} value={i}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await commit({
                            ...data,
                            leads: data.leads.filter((x) => x.id !== l.id),
                          });
                        } catch {}
                      }}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo lead comercial"
      >
        <form onSubmit={save}>
          <Field label="Identificador (opcional)">
            <input
              maxLength={80}
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Etapa atual">
            <select
              value={draft.stage}
              onChange={(e) =>
                setDraft({ ...draft, stage: Number(e.target.value) })
              }
            >
              {stages.slice(0, 5).map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conjunto">
            <select
              value={draft.adsetId}
              onChange={(e) =>
                setDraft({ ...draft, adsetId: e.target.value, creativeId: "" })
              }
            >
              <option value="">Sem atribuição</option>
              {data.adsets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Criativo">
            <select
              value={draft.creativeId}
              onChange={(e) =>
                setDraft({ ...draft, creativeId: e.target.value })
              }
            >
              <option value="">Sem atribuição</option>
              {data.creatives
                .filter((c) => c.adsetId === draft.adsetId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button disabled={busy}>Salvar lead</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function Goals() {
  const { data, commit, busy } = useStore(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [delivery, setDelivery] = useState(80),
    [estimatedCpa, setEstimatedCpa] = useState(8),
    [dailyBudget, setDailyBudget] = useState(
      data.settings.sets * data.settings.budget,
    ),
    [goal, setGoal] = useState<Goal>({
      id: uid(),
      name: "Meta mensal",
      amount: 30000,
      metric: "operating",
      month: today().slice(0, 7),
    });
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (goal.amount <= 0) throw new Error("A meta precisa ser positiva.");
      await commit({ ...data, goals: [...data.goals, { ...goal, id: uid() }] });
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CRESÇA COM DIREÇÃO</div>
          <h1>
            Metas financeiras<span className="title-dot">.</span>
          </h1>
          <p>Transforme objetivos em uma trajetória mensurável.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Nova meta
        </Button>
      </div>
      <section className="panel">
        <h2>Hipóteses para alcançar as metas</h2>
        <p className="micro">
          Projeções editáveis, sem garantia de conversão. Um produto por pedido
          e todos os pedidos enviados.
        </p>
        <div className="form-grid">
          <Field label="Taxa de entrega paga (%)">
            <input
              type="number"
              min="0"
              max="100"
              value={delivery}
              onChange={(e) =>
                setDelivery(Math.max(0, Math.min(100, Number(e.target.value))))
              }
            />
          </Field>
          <Field label="CPA estimado (R$)">
            <input
              type="number"
              min=".01"
              step=".01"
              value={estimatedCpa}
              onChange={(e) =>
                setEstimatedCpa(Math.max(0.01, Number(e.target.value)))
              }
            />
          </Field>
          <Field label="Orçamento diário futuro (R$)">
            <input
              type="number"
              min="0"
              step=".01"
              value={dailyBudget}
              onChange={(e) =>
                setDailyBudget(Math.max(0, Number(e.target.value)))
              }
            />
          </Field>
        </div>
      </section>
      {!data.goals.length ? (
        <section className="panel">
          <Empty text="Defina sua primeira meta de receita ou resultado." />
        </section>
      ) : (
        <div className="two-col">
          {data.goals.map((g) => {
            const last = new Date(
                Number(g.month.slice(0, 4)),
                Number(g.month.slice(5)),
                0,
              ).getDate(),
              m = metrics(data, `${g.month}-01`, `${g.month}-${last}`),
              v = m[g.metric],
              remaining = Math.max(0, g.amount - v),
              now = today(),
              days =
                now.slice(0, 7) === g.month
                  ? last - Number(now.slice(-2)) + 1
                  : now.slice(0, 7) < g.month
                    ? last
                    : 0,
              unit =
                data.settings.price +
                data.settings.shipping -
                data.settings.cost,
              receipt =
                data.settings.shipping + (data.settings.price * delivery) / 100,
              unitResult =
                g.metric === "revenue"
                  ? receipt
                  : receipt - data.settings.cost - estimatedCpa,
              needed =
                unitResult > 0 ? Math.ceil(remaining / unitResult) : null,
              possible = ratio(dailyBudget * days, estimatedCpa),
              cpaLimit =
                remaining > 0 && days > 0
                  ? ratio(
                      dailyBudget *
                        days *
                        (g.metric === "revenue"
                          ? receipt
                          : receipt - data.settings.cost),
                      remaining +
                        (g.metric === "revenue" ? 0 : dailyBudget * days),
                    )
                  : 0;
            return (
              <section className="panel" key={g.id}>
                <div className="panel-title">
                  <h2>{g.name}</h2>
                  <Badge tone={v >= g.amount ? "positive" : "neutral"}>
                    {v >= g.amount ? "Meta atingida" : g.month}
                  </Badge>
                </div>
                <p>
                  {
                    {
                      revenue: "Faturamento recebido",
                      operating: "Resultado operacional",
                      net: "Resultado líquido",
                    }[g.metric]
                  }
                </p>
                <h1>
                  {money(v)} <small>/ {money(g.amount)}</small>
                </h1>
                <div className="progress large">
                  <i
                    style={{
                      width: `${Math.max(0, Math.min(100, ratio(v, g.amount) * 100))}%`,
                    }}
                  />
                </div>
                <div className="result-lines">
                  <div>
                    <span>Percentual atingido</span>
                    <strong>{(ratio(v, g.amount) * 100).toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span>Quanto falta</span>
                    <strong>{money(remaining)}</strong>
                  </div>
                  <div>
                    <span>Dias restantes</span>
                    <strong>{days}</strong>
                  </div>
                  <div>
                    <span>Média diária necessária</span>
                    <strong>{money(ratio(remaining, days))}</strong>
                  </div>
                  <div>
                    <span>Projeção por média do mês</span>
                    <strong>
                      {money(
                        ratio(
                          v,
                          now.slice(0, 7) === g.month
                            ? Number(now.slice(-2))
                            : last,
                        ) * last,
                      )}
                    </strong>
                  </div>
                </div>
                <div className="result-lines">
                  <div>
                    <span>Pedidos necessários (hipótese)</span>
                    <strong>{needed ?? "Margem insuficiente"}</strong>
                  </div>
                  <div>
                    <span>Entregas pagas necessárias</span>
                    <strong>
                      {needed === null
                        ? "—"
                        : Math.ceil((needed * delivery) / 100)}
                    </strong>
                  </div>
                  <div>
                    <span>Pedidos possíveis pelo orçamento / CPA</span>
                    <strong>{possible.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span>CPA máximo para a meta neste orçamento</span>
                    <strong>{money(Math.max(0, cpaLimit))}</strong>
                  </div>
                </div>
                <p className="micro">
                  As projeções não incluem novas despesas, impostos ou estornos.
                  CPA limite considera o orçamento futuro e a taxa de entrega
                  informada.
                </p>
                <p className="micro">
                  Hipótese ideal (100% de entregas): ao menos{" "}
                  {Math.ceil(
                    ratio(
                      remaining,
                      g.metric === "revenue"
                        ? data.settings.price + data.settings.shipping
                        : unit,
                    ),
                  )}{" "}
                  pedidos/entregas adicionais, antes de novos anúncios e
                  despesas. Use o simulador para estimar CPA e taxas de entrega
                  específicas.
                </p>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await commit({
                        ...data,
                        goals: data.goals.filter((x) => x.id !== g.id),
                      });
                    } catch {}
                  }}
                >
                  Excluir meta
                </Button>
              </section>
            );
          })}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova meta financeira"
      >
        <form onSubmit={save}>
          <Field label="Nome">
            <input
              required
              value={goal.name}
              onChange={(e) => setGoal({ ...goal, name: e.target.value })}
            />
          </Field>
          <Field label="Métrica">
            <select
              value={goal.metric}
              onChange={(e) =>
                setGoal({ ...goal, metric: e.target.value as Goal["metric"] })
              }
            >
              <option value="revenue">Faturamento</option>
              <option value="operating">Resultado operacional</option>
              <option value="net">Resultado líquido</option>
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input
              type="number"
              required
              min="1"
              value={goal.amount}
              onChange={(e) =>
                setGoal({ ...goal, amount: Number(e.target.value) })
              }
            />
          </Field>
          <div className="preset-buttons">
            {[5000, 10000, 20000, 30000, 50000, 100000].map((a) => (
              <Button
                type="button"
                variant="outline"
                key={a}
                onClick={() => setGoal({ ...goal, amount: a })}
              >
                {a / 1000} mil
              </Button>
            ))}
          </div>
          <Field label="Mês">
            <input
              type="month"
              required
              value={goal.month}
              onChange={(e) => setGoal({ ...goal, month: e.target.value })}
            />
          </Field>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button disabled={busy}>Salvar meta</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function SettingsPage() {
  const { data, commit, busy, demo, revision } = useStore(),
    [s, setS] = useState<Settings>(data.settings),
    [msg, setMsg] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await commit({ ...data, settings: s });
      setMsg("Configurações salvas. Novos pedidos usarão estes valores.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">DO SEU JEITO</div>
          <h1>
            Configurações<span className="title-dot">.</span>
          </h1>
          <p>Parâmetros da operação e limites de acompanhamento.</p>
        </div>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Seu negócio</h2>
          <form onSubmit={save}>
            <Field label="Nome do produto">
              <input
                required
                value={s.product}
                onChange={(e) => setS({ ...s, product: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              {[
                ["price", "Produto na entrega (R$)"],
                ["shipping", "Frete antecipado (R$)"],
                ["cost", "Custo de produto + envio (R$)"],
                ["sets", "Conjuntos planejados"],
                ["budget", "Orçamento por conjunto (R$)"],
                ["creatives", "Criativos por conjunto"],
                ["cpaAlert", "Alerta de CPA (R$)"],
                ["lateDays", "Alerta de atraso (dias do pedido)"],
                ["returnAlert", "Alerta de devolução (%)"],
              ].map(([k, l]) => (
                <Field label={l} key={k}>
                  <input
                    required
                    type="number"
                    min="0"
                    step={
                      ["sets", "creatives", "lateDays"].includes(k)
                        ? "1"
                        : ".01"
                    }
                    value={Number(s[k as keyof Settings])}
                    onChange={(e) =>
                      setS({ ...s, [k]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
            </div>
            <p className="micro">
              Produto e envio são um único custo. Mudanças valem para novos
              pedidos e simulador; preservam o histórico. Quantidades planejadas
              não criam nem removem registros. Ajuste o orçamento efetivo de
              cada conjunto em Tráfego pago.
            </p>
            {msg && <p role="status">{msg}</p>}
            <div className="form-actions">
              <Button disabled={busy}>
                <Save size={16} /> Salvar configurações
              </Button>
            </div>
          </form>
        </section>
        <div>
          <section className="panel">
            <div className="panel-title">
              <h2>
                <ShieldCheck size={18} /> Persistência e acesso
              </h2>
              <Badge tone={demo ? "warning" : "positive"}>
                {demo ? "Demonstração" : "Supabase"}
              </Badge>
            </div>
            <p>
              {demo
                ? "Dados fictícios guardados apenas neste navegador, separados da conta real."
                : "Dados vinculados à sua conta, protegidos por RLS e gravação autenticada."}
            </p>
            <p className="micro">
              Revisão do banco: {revision}. Um usuário tem acesso apenas ao seu
              espaço. A aplicação não oferece compartilhamento de equipe nesta
              versão.
            </p>
          </section>
          <section className="panel">
            <h2>Integrações</h2>
            <div className="ledger-line">
              <span>Meta Ads</span>
              <Badge>Não conectado</Badge>
            </div>
            <div className="ledger-line">
              <span>WhatsApp</span>
              <Badge>Manual</Badge>
            </div>
            <div className="ledger-line">
              <span>Modelo de IA</span>
              <Badge>Não conectado</Badge>
            </div>
            <p className="micro">
              Análises financeiras locais usam fórmulas transparentes. Não há
              envio automático de mensagens ou conexão com plataformas externas.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
