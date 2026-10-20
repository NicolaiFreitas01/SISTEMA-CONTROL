import { useState, type FormEvent } from "react";
import Papa from "papaparse";
import { Plus, Upload, Pause, Play, Image, ExternalLink } from "lucide-react";
import { useStore } from "../lib/store";
import {
  metrics,
  money,
  ratio,
  uid,
  today,
  type Traffic,
  type Creative,
} from "../lib/domain";
import { Button, Modal, Field, Badge, Empty } from "../components/ui";
export function Marketing({
  creative = false,
  from,
  to,
}: {
  creative?: boolean;
  from: string;
  to: string;
}) {
  const { data, commit, busy } = useStore(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [edit, setEdit] = useState<Creative>(),
    [draft, setDraft] = useState({
      name: "",
      adsetId: data.adsets[0]?.id ?? "",
      url: "",
      date: today(),
    });
  const [traffic, setTraffic] = useState<Traffic>({
    id: uid(),
    date: today(),
    adsetId: data.adsets[0]?.id ?? "",
    creativeId: "",
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversations: 0,
  });
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (creative) {
        if (
          !draft.name.trim() ||
          !data.adsets.some((a) => a.id === draft.adsetId)
        )
          throw new Error("Informe o nome e um conjunto válido.");
        if (draft.url && !/^https:\/\//i.test(draft.url))
          throw new Error("A mídia deve ser uma URL HTTPS.");
        const c: Creative = {
          ...draft,
          id: edit?.id ?? uid(),
          active: edit?.active ?? true,
        };
        await commit({
          ...data,
          creatives: edit
            ? data.creatives.map((x) => (x.id === edit.id ? c : x))
            : [...data.creatives, c],
        });
      } else {
        if (
          !data.adsets.some((a) => a.id === traffic.adsetId) ||
          !traffic.date ||
          [
            traffic.spend,
            traffic.clicks,
            traffic.impressions,
            traffic.conversations,
          ].some((v) => !Number.isFinite(v) || v < 0)
        )
          throw new Error("Confira os valores do lançamento.");
        if (
          data.traffic.some(
            (t) =>
              t.date === traffic.date &&
              t.adsetId === traffic.adsetId &&
              (!t.creativeId ||
                !traffic.creativeId ||
                t.creativeId === traffic.creativeId),
          )
        )
          throw new Error(
            "Já existe lançamento para esta data/conjunto/criativo. Exclua o anterior para corrigir.",
          );
        await commit({
          ...data,
          traffic: [...data.traffic, { ...traffic, id: uid() }],
        });
      }
      setOpen(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importCSV(file: File) {
    try {
      const parsed = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length)
        throw new Error("CSV inválido: " + parsed.errors[0].message);
      const required = [
        "date",
        "adset",
        "spend",
        "impressions",
        "clicks",
        "conversations",
      ];
      if (required.some((k) => !parsed.meta.fields?.includes(k)))
        throw new Error(
          "Use as colunas: date,adset,creative,spend,impressions,clicks,conversations. Datas AAAA-MM-DD, decimais com ponto.",
        );
      const rows = parsed.data.map((r) => {
        const a = data.adsets.find((a) => a.name === r.adset);
        if (!a) throw new Error(`Conjunto não encontrado: ${r.adset}`);
        const c = r.creative
          ? data.creatives.find(
              (c) => c.name === r.creative && c.adsetId === a.id,
            )
          : undefined;
        if (r.creative && !c)
          throw new Error(`Criativo não encontrado: ${r.creative}`);
        const row = {
          id: uid(),
          date: r.date,
          adsetId: a.id,
          creativeId: c?.id ?? "",
          spend: Number(r.spend),
          impressions: Number(r.impressions),
          clicks: Number(r.clicks),
          conversations: Number(r.conversations),
        };
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
          Number.isNaN(Date.parse(row.date)) ||
          [row.spend, row.impressions, row.clicks, row.conversations].some(
            (v) => !Number.isFinite(v) || v < 0,
          )
        )
          throw new Error("CSV com datas ou valores inválidos.");
        return row;
      });
      for (const r of rows) {
        if (
          [...data.traffic, ...rows.filter((x) => x.id !== r.id)].some(
            (t) =>
              t.date === r.date &&
              t.adsetId === r.adsetId &&
              (!t.creativeId || !r.creativeId),
          )
        )
          throw new Error(
            "Não combine totais de conjunto e detalhes por criativo para a mesma data.",
          );
      }
      const keys = new Set(
        data.traffic.map((t) => `${t.date}:${t.adsetId}:${t.creativeId}`),
      );
      for (const r of rows) {
        const k = `${r.date}:${r.adsetId}:${r.creativeId}`;
        if (keys.has(k))
          throw new Error(
            "Importação contém dados já lançados ou linhas duplicadas. Nenhuma linha foi importada.",
          );
        keys.add(k);
      }
      await commit({ ...data, traffic: [...data.traffic, ...rows] });
      setNote(`${rows.length} linhas importadas.`);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const items = creative ? data.creatives : data.adsets;
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CRESCIMENTO COM RENTABILIDADE</div>
          <h1>
            {creative ? "Gestão de criativos" : "Tráfego pago"}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {creative
              ? "Cliques chamam atenção. Vendas pagas comprovam resultado."
              : "Orçamento é intenção. Gasto real é o que entra na conta."}
          </p>
        </div>
        <Button
          onClick={() => {
            setEdit(undefined);
            setDraft({
              name: "",
              adsetId: data.adsets[0]?.id ?? "",
              url: "",
              date: today(),
            });
            setOpen(true);
            setError("");
          }}
        >
          <Plus size={16} />
          {creative ? "Novo criativo" : "Lançar métricas"}
        </Button>
      </div>
      <div className="notice">
        <Badge tone="warning">Meta Ads desconectado</Badge> Lançamento manual e
        importação CSV disponíveis. Nenhuma sincronização automática está ativa.
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {note && <p className="positive-text">{note}</p>}
      {!creative && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Seu plano de investimento</h2>
              <p>
                {data.adsets.filter((a) => a.active).length} conjuntos ativos ·{" "}
                {data.creatives.length} criativos cadastrados
              </p>
            </div>
            <label className="btn btn-outline">
              <Upload size={15} /> Importar CSV
              <input
                className="sr-only"
                type="file"
                accept=".csv"
                onChange={(e) =>
                  e.target.files?.[0] && importCSV(e.target.files[0])
                }
              />
            </label>
          </div>
          <p>
            Orçamento diário planejado:{" "}
            <strong className="positive-text">
              {money(
                data.adsets
                  .filter((a) => a.active)
                  .reduce((s, a) => s + a.budget, 0),
              )}
            </strong>{" "}
            · Em 30 dias:{" "}
            {money(
              data.adsets
                .filter((a) => a.active)
                .reduce((s, a) => s + a.budget, 0) * 30,
            )}
          </p>
          <details>
            <summary>Formato do CSV</summary>
            <pre>
              date,adset,creative,spend,impressions,clicks,conversations{"\n"}
              {today()},Conjunto 01,,20,1000,35,8
            </pre>
            <p className="micro">
              Exporte/renomeie as colunas do Meta Ads para este formato. Use uma
              linha por data/conjunto/criativo. Totais de conjunto e detalhes de
              criativos não devem incluir o mesmo gasto.
            </p>
          </details>
        </section>
      )}
      {creative ? (
        <div className="creative-grid">
          {data.creatives.map((c) => {
            const m = metrics(data, from, to, c.adsetId, c.id),
              label =
                m.shippingOrders < 5
                  ? "Dados insuficientes"
                  : m.net < 0
                    ? "Resultado negativo"
                    : m.cpa > data.settings.cpaAlert
                      ? "CPA elevado"
                      : "Rentável";
            return (
              <article className="panel creative-card" key={c.id}>
                <div className="creative-media">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer">
                      <Image size={30} />
                      <span>
                        Abrir mídia <ExternalLink size={12} />
                      </span>
                    </a>
                  ) : (
                    <>
                      <Image size={30} />
                      <span>Sem mídia cadastrada</span>
                    </>
                  )}
                  <Badge tone={c.active ? "positive" : "neutral"}>
                    {c.active ? "Em teste" : "Pausado"}
                  </Badge>
                </div>
                <h3>{c.name}</h3>
                <p>
                  {data.adsets.find((a) => a.id === c.adsetId)?.name} · {c.date}
                </p>
                <div className="creative-numbers">
                  <span>
                    Receita<strong>{money(m.revenue)}</strong>
                  </span>
                  <span>
                    Resultado
                    <strong
                      className={m.net >= 0 ? "positive-text" : "negative"}
                    >
                      {money(m.net)}
                    </strong>
                  </span>
                  <span>
                    CPA<strong>{money(m.cpa)}</strong>
                  </span>
                  <span>
                    Entregas pagas<strong>{m.paid}</strong>
                  </span>
                  <span>
                    Gasto<strong>{money(m.ads)}</strong>
                  </span>
                  <span>
                    Cliques / conversas
                    <strong>
                      {m.clicks} / {m.conversations}
                    </strong>
                  </span>
                </div>
                <Badge tone={label === "Rentável" ? "positive" : "neutral"}>
                  {label}
                </Badge>
                <div className="form-actions">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEdit(c);
                      setDraft(c);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await commit({
                          ...data,
                          creatives: data.creatives.map((x) =>
                            x.id === c.id ? { ...x, active: !x.active } : x,
                          ),
                        });
                      } catch {}
                    }}
                  >
                    {c.active ? <Pause size={13} /> : <Play size={13} />}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={
                      data.orders.some((o) => o.creativeId === c.id) ||
                      data.traffic.some((t) => t.creativeId === c.id)
                    }
                    onClick={async () => {
                      try {
                        await commit({
                          ...data,
                          creatives: data.creatives.filter(
                            (x) => x.id !== c.id,
                          ),
                        });
                      } catch {}
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <div className="panel-title">
            <h2>Comparativo dos conjuntos</h2>
            <Badge>Meta Ads · manual</Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "CONJUNTO",
                    "ORÇAMENTO / DIA",
                    "GASTO",
                    "IMPRESSÕES",
                    "CLIQUES",
                    "CTR",
                    "CPC",
                    "CONVERSAS",
                    "FRETES PAGOS",
                    "ENTREGAS PAGAS",
                    "CPA",
                    "ROAS",
                    "RECEITA",
                    "RESULTADO",
                    "STATUS",
                  ].map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.adsets.map((a) => {
                  const m = metrics(data, from, to, a.id);
                  return (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>
                        <input
                          className="budget-input"
                          aria-label={`Orçamento ${a.name}`}
                          type="number"
                          min="0"
                          step=".01"
                          defaultValue={a.budget}
                          onBlur={async (e) => {
                            const budget = Number(e.target.value);
                            if (budget < 0 || !Number.isFinite(budget)) {
                              e.target.value = String(a.budget);
                              return;
                            }
                            try {
                              await commit({
                                ...data,
                                adsets: data.adsets.map((x) =>
                                  x.id === a.id ? { ...x, budget } : x,
                                ),
                              });
                            } catch {}
                          }}
                        />
                      </td>
                      <td>{money(m.ads)}</td>
                      <td>{m.impressions}</td>
                      <td>{m.clicks}</td>
                      <td>
                        {(ratio(m.clicks, m.impressions) * 100).toFixed(2)}%
                      </td>
                      <td>{money(ratio(m.ads, m.clicks))}</td>
                      <td>{m.conversations}</td>
                      <td>{m.shippingOrders}</td>
                      <td>{m.paid}</td>
                      <td>{money(m.cpa)}</td>
                      <td>{m.roas.toFixed(2)}x</td>
                      <td>{money(m.revenue)}</td>
                      <td className={m.net >= 0 ? "positive-text" : "negative"}>
                        {money(m.net)}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={async () => {
                            try {
                              await commit({
                                ...data,
                                adsets: data.adsets.map((x) =>
                                  x.id === a.id
                                    ? { ...x, active: !x.active }
                                    : x,
                                ),
                              });
                            } catch {}
                          }}
                        >
                          {a.active ? "Pausar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {creative && (
        <section className="panel">
          <h2>Ranking por resultado comprovado</h2>
          {data.creatives
            .filter(
              (c) =>
                metrics(data, from, to, c.adsetId, c.id).shippingOrders >= 5,
            )
            .sort(
              (a, b) =>
                metrics(data, from, to, b.adsetId, b.id).net -
                metrics(data, from, to, a.adsetId, a.id).net,
            )
            .map((c, i) => (
              <div className="ledger-line" key={c.id}>
                <span>
                  {i + 1}. {c.name}
                </span>
                <strong>
                  {money(metrics(data, from, to, c.adsetId, c.id).net)}
                </strong>
              </div>
            ))}
          <p className="micro">
            Somente criativos com pelo menos cinco fretes pagos entram no
            ranking. Critério: resultado líquido atribuído. Sem volume
            suficiente, não há campeão comprovado.
          </p>
        </section>
      )}
      {!creative && (
        <section className="panel">
          <h2>Lançamentos de tráfego</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>CONJUNTO</th>
                  <th>CRIATIVO</th>
                  <th>GASTO</th>
                  <th>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {data.traffic
                  .filter((t) => t.date >= from && t.date <= to)
                  .slice()
                  .reverse()
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>
                        {data.adsets.find((a) => a.id === t.adsetId)?.name}
                      </td>
                      <td>
                        {data.creatives.find((c) => c.id === t.creativeId)
                          ?.name ?? "Sem atribuição"}
                      </td>
                      <td>{money(t.spend)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await commit({
                                ...data,
                                traffic: data.traffic.filter(
                                  (x) => x.id !== t.id,
                                ),
                              });
                            } catch {}
                          }}
                        >
                          Excluir para corrigir
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          creative ? "Dados do criativo" : "Registrar gasto real e métricas"
        }
      >
        <form onSubmit={save}>
          <div className="form-grid">
            {creative ? (
              <>
                <Field label="Nome">
                  <input
                    required
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="URL HTTPS da imagem ou vídeo">
                  <input
                    type="url"
                    value={draft.url}
                    onChange={(e) =>
                      setDraft({ ...draft, url: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : null}
            <Field label="Data">
              <input
                required
                type="date"
                value={creative ? draft.date : traffic.date}
                onChange={(e) =>
                  creative
                    ? setDraft({ ...draft, date: e.target.value })
                    : setTraffic({ ...traffic, date: e.target.value })
                }
              />
            </Field>
            <Field label="Conjunto">
              <select
                value={creative ? draft.adsetId : traffic.adsetId}
                onChange={(e) =>
                  creative
                    ? setDraft({ ...draft, adsetId: e.target.value })
                    : setTraffic({
                        ...traffic,
                        adsetId: e.target.value,
                        creativeId: "",
                      })
                }
              >
                {data.adsets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            {!creative && (
              <>
                <Field label="Criativo">
                  <select
                    value={traffic.creativeId}
                    onChange={(e) =>
                      setTraffic({ ...traffic, creativeId: e.target.value })
                    }
                  >
                    <option value="">Sem atribuição</option>
                    {data.creatives
                      .filter((c) => c.adsetId === traffic.adsetId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </Field>
                {[
                  ["spend", "Gasto real (R$)"],
                  ["impressions", "Impressões"],
                  ["clicks", "Cliques"],
                  ["conversations", "Conversas iniciadas"],
                ].map(([k, label]) => (
                  <Field label={label} key={k}>
                    <input
                      type="number"
                      required
                      min="0"
                      step={k === "spend" ? ".01" : "1"}
                      value={Number(traffic[k as keyof Traffic])}
                      onChange={(e) =>
                        setTraffic({ ...traffic, [k]: Number(e.target.value) })
                      }
                    />
                  </Field>
                ))}
              </>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button disabled={busy}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
