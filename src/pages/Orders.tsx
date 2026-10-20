import { useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  statuses,
  today,
  uid,
  money,
  recordOrderEvent,
  refundOrder,
  type Order,
} from "../lib/domain";
import { Button, Modal, Field, Badge, Empty } from "../components/ui";
import { exportRows } from "../lib/export";
export function OrderForm({
  order,
  onClose,
}: {
  order?: Order;
  onClose: () => void;
}) {
  const { data, commit, busy } = useStore(),
    [error, setError] = useState("");
  const [value, setValue] = useState<Order>(
    order ?? {
      id: uid(),
      name: "",
      phone: "",
      city: "",
      state: "",
      zip: "",
      date: today(),
      quantity: 1,
      price: data.settings.price,
      shipping: data.settings.shipping,
      cost: data.settings.cost,
      source: "Meta Ads",
      adsetId: "",
      creativeId: "",
      tracking: "",
      status: "Novo pedido",
      notes: "",
    },
  );
  const set = (k: keyof Order, v: unknown) =>
    setValue((x) => ({ ...x, [k]: v }));
  const locked = !!order && data.entries.some((e) => e.orderId === order.id);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (
        !value.name.trim() ||
        value.quantity < 1 ||
        !Number.isInteger(value.quantity) ||
        value.price < 0 ||
        value.shipping < 0 ||
        value.cost < 0
      )
        throw new Error("Confira os dados do pedido.");
      await commit({
        ...data,
        orders: order
          ? data.orders.map((o) => (o.id === order.id ? value : o))
          : [...data.orders, value],
        history: [
          ...data.history,
          {
            id: uid(),
            orderId: value.id,
            date: new Date().toISOString(),
            action: order ? "Pedido atualizado" : "Pedido criado",
          },
        ],
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={save}>
      <div className="form-grid">
        {[
          ["name", "Nome do cliente"],
          ["phone", "Telefone"],
          ["city", "Cidade"],
          ["state", "Estado"],
          ["zip", "CEP"],
          ["tracking", "Código de rastreio"],
        ].map(([k, label]) => (
          <Field key={k} label={label}>
            <input
              required={k === "name"}
              maxLength={k === "state" ? 2 : 150}
              value={String(value[k as keyof Order])}
              onChange={(e) => set(k as keyof Order, e.target.value)}
            />
          </Field>
        ))}
        <Field label="Data do pedido">
          <input
            type="date"
            required
            value={value.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="Origem">
          <select
            value={value.source}
            onChange={(e) => set("source", e.target.value)}
          >
            {["Meta Ads", "Orgânico", "Indicação", "Outros"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {[
          ["quantity", "Quantidade"],
          ["price", "Produto por unidade (R$)"],
          ["shipping", "Frete total antecipado (R$)"],
          ["cost", "Custo por unidade com envio (R$)"],
        ].map(([k, label]) => (
          <Field label={label} key={k}>
            <input
              type="number"
              required
              disabled={locked}
              min={k === "quantity" ? 1 : 0}
              step={k === "quantity" ? 1 : ".01"}
              value={Number(value[k as keyof Order])}
              onChange={(e) => set(k as keyof Order, Number(e.target.value))}
            />
          </Field>
        ))}
        <Field label="Conjunto">
          <select
            value={value.adsetId}
            disabled={locked}
            onChange={(e) => {
              set("adsetId", e.target.value);
              set("creativeId", "");
            }}
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
            value={value.creativeId}
            disabled={locked}
            onChange={(e) => set("creativeId", e.target.value)}
          >
            <option value="">Sem atribuição</option>
            {data.creatives
              .filter((c) => c.adsetId === value.adsetId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Status operacional">
          <select
            value={value.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Observações">
        <textarea
          value={value.notes}
          maxLength={2000}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      <div className="notice">
        Total:{" "}
        <strong>{money(value.price * value.quantity + value.shipping)}</strong>{" "}
        · A pagar na entrega:{" "}
        <strong>{money(value.price * value.quantity)}</strong>. Alterar o status
        não confirma pagamentos. Use as ações financeiras do pedido.
      </div>
      {locked && (
        <p className="micro">
          Valores e atribuição preservados porque o pedido já possui lançamentos
          financeiros.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={busy}>Salvar pedido</Button>
      </div>
    </form>
  );
}
export function Orders({
  newOpen,
  onCloseNew,
  from,
  to,
}: {
  newOpen: boolean;
  onCloseNew: () => void;
  from: string;
  to: string;
}) {
  const { data, commit, busy } = useStore(),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [kanban, setKanban] = useState(false),
    [editing, setEditing] = useState<Order>(),
    [detail, setDetail] = useState<Order>(),
    [action, setAction] = useState(""),
    [date, setDate] = useState(today()),
    [amount, setAmount] = useState(""),
    [error, setError] = useState("");
  const orders = data.orders.filter(
    (o) =>
      o.date >= from &&
      o.date <= to &&
      (!status || o.status === status) &&
      `${o.name} ${o.phone} ${o.city}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = detail
    ? data.orders.find((o) => o.id === detail.id)
    : undefined;
  async function run() {
    try {
      if (!selected || !date) return;
      let next = data;
      if (action === "refund")
        next = refundOrder(data, selected, Number(amount), date);
      else if (["shipping", "shipment", "product"].includes(action))
        next = recordOrderEvent(
          data,
          selected,
          action as "shipping" | "shipment" | "product",
          date,
        );
      else if (action === "delete") {
        if (data.entries.some((e) => e.orderId === selected.id))
          throw new Error(
            "Pedido com lançamentos não pode ser excluído. Use cancelamento e reembolso.",
          );
        next = {
          ...data,
          orders: data.orders.filter((o) => o.id !== selected.id),
          history: data.history.filter((h) => h.orderId !== selected.id),
        };
      }
      await commit(next);
      setAction("");
      if (action === "delete") setDetail(undefined);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">OPERAÇÃO CASH ON DELIVERY</div>
          <h1>
            Pedidos e vendas<span className="title-dot">.</span>
          </h1>
          <p>Do primeiro contato à entrega confirmada.</p>
        </div>
        <Badge>{orders.length} pedidos no período</Badge>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Buscar cliente"
              placeholder="Buscar cliente, telefone ou cidade..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setKanban(!kanban)}>
            {kanban ? <List size={16} /> : <LayoutGrid size={16} />}{" "}
            {kanban ? "Tabela" : "Kanban"}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await exportRows(
                  orders.map((o) => ({
                    Cliente: o.name,
                    Telefone: o.phone,
                    Data: o.date,
                    Cidade: o.city,
                    Estado: o.state,
                    Status: o.status,
                    Total: o.price * o.quantity + o.shipping,
                  })),
                  "csv",
                  "pedidos",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Download size={16} /> CSV
          </Button>
        </div>
        {error && <p className="error">{error}</p>}
        {kanban ? (
          <div className="kanban">
            {statuses.map((s) => (
              <div className="kanban-column" key={s}>
                <h3>
                  {s}{" "}
                  <Badge>{orders.filter((o) => o.status === s).length}</Badge>
                </h3>
                {orders
                  .filter((o) => o.status === s)
                  .map((o) => (
                    <button
                      className="kanban-card"
                      key={o.id}
                      onClick={() => {
                        setDetail(o);
                        setError("");
                      }}
                    >
                      <strong>{o.name}</strong>
                      <span>
                        {o.city} / {o.state}
                      </span>
                      <b>{money(o.price * o.quantity + o.shipping)}</b>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ) : orders.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CLIENTE</th>
                  <th>DATA</th>
                  <th>CIDADE</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .slice()
                  .reverse()
                  .map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="avatar">{o.name[0]}</span>
                        {o.name}
                        <small className="table-sub">{o.phone}</small>
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
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setDetail(o);
                            setError("");
                          }}
                          aria-label={`Abrir pedido de ${o.name}`}
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Cadastre um pedido ou ajuste os filtros." />
        )}
      </section>
      <Modal
        open={newOpen || !!editing}
        onClose={() => {
          onCloseNew();
          setEditing(undefined);
        }}
        title={editing ? "Editar pedido" : "Novo pedido"}
      >
        <OrderForm
          key={editing?.id ?? "new"}
          order={editing}
          onClose={() => {
            onCloseNew();
            setEditing(undefined);
          }}
        />
      </Modal>
      <Modal
        open={!!selected}
        onClose={() => {
          setDetail(undefined);
          setAction("");
        }}
        title={selected?.name ?? "Pedido"}
      >
        {selected && (
          <>
            <div className="detail-head">
              <Badge>{selected.status}</Badge>
              <strong>
                {money(selected.price * selected.quantity + selected.shipping)}
              </strong>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(selected);
                  setDetail(undefined);
                }}
              >
                Editar pedido
              </Button>
            </div>
            <p>
              {selected.city} / {selected.state} ·{" "}
              {selected.phone || "Sem telefone"}
            </p>
            <p className="micro">
              Rastreio: {selected.tracking || "Não informado"} ·{" "}
              {selected.notes}
            </p>
            <div className="action-grid">
              {[
                ["shipping", "Confirmar frete"],
                ["shipment", "Registrar despacho"],
                ["product", "Confirmar pagamento"],
                ["refund", "Reembolsar"],
                ["delete", "Excluir pedido sem lançamentos"],
              ].map(([k, label]) => (
                <Button
                  key={k}
                  variant={k === "delete" ? "ghost" : "outline"}
                  disabled={
                    busy ||
                    (["shipping", "shipment", "product"].includes(k) &&
                      data.entries.some(
                        (e) => e.orderId === selected.id && e.kind === k,
                      ))
                  }
                  onClick={() => {
                    setAction(k);
                    setError("");
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            {action && (
              <div className="notice">
                <h3>
                  {action === "delete"
                    ? "Confirmar exclusão?"
                    : "Registrar evento financeiro"}
                </h3>
                {action !== "delete" && (
                  <Field label="Data efetiva">
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                )}
                {action === "refund" && (
                  <Field label="Valor do reembolso">
                    <input
                      type="number"
                      min="0.01"
                      step=".01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                )}
                <Button
                  disabled={
                    busy || !date || (action === "refund" && !Number(amount))
                  }
                  onClick={run}
                >
                  Confirmar
                </Button>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <h3>Movimentações financeiras</h3>
            {data.entries
              .filter((e) => e.orderId === selected.id)
              .map((e) => (
                <div className="ledger-line" key={e.id}>
                  <span>
                    {e.date} · {e.category}
                  </span>
                  <strong
                    className={
                      ["refund", "shipment"].includes(e.kind)
                        ? "negative"
                        : "positive-text"
                    }
                  >
                    {money(e.amount)}
                  </strong>
                </div>
              ))}
            <h3>Histórico</h3>
            <div className="timeline">
              {data.history
                .filter((h) => h.orderId === selected.id)
                .slice()
                .reverse()
                .map((h) => (
                  <p key={h.id}>
                    <small>{new Date(h.date).toLocaleString("pt-BR")}</small>
                    {h.action}
                  </p>
                ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
