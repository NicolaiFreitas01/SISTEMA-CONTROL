export const statuses = [
  "Novo pedido",
  "Aguardando frete",
  "Frete pago",
  "Preparando envio",
  "Enviado",
  "Em transporte",
  "Entregue sem pagamento confirmado",
  "Entregue e pago",
  "Recusado",
  "Cancelado",
  "Devolvido",
  "Reembolsado",
] as const;
export type Status = (typeof statuses)[number];
export type Settings = {
  product: string;
  price: number;
  shipping: number;
  cost: number;
  sets: number;
  budget: number;
  creatives: number;
  cpaAlert: number;
  lateDays: number;
  returnAlert: number;
};
export const defaults: Settings = {
  product: "LABIRINEX",
  price: 97,
  shipping: 29,
  cost: 29,
  sets: 4,
  budget: 20,
  creatives: 4,
  cpaAlert: 25,
  lateDays: 7,
  returnAlert: 20,
};
export type Order = {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  quantity: number;
  price: number;
  shipping: number;
  cost: number;
  source: string;
  adsetId: string;
  creativeId: string;
  tracking: string;
  status: Status;
  notes: string;
};
export type Entry = {
  id: string;
  orderId?: string;
  eventKey?: string;
  date: string;
  kind:
    | "shipping"
    | "product"
    | "shipment"
    | "ads"
    | "income"
    | "expense"
    | "refund";
  amount: number;
  category: string;
  description: string;
  adsetId?: string;
  creativeId?: string;
  recurring?: boolean;
};
export type Adset = {
  id: string;
  name: string;
  budget: number;
  active: boolean;
};
export type Creative = {
  id: string;
  adsetId: string;
  name: string;
  url: string;
  date: string;
  active: boolean;
};
export type Traffic = {
  id: string;
  date: string;
  adsetId: string;
  creativeId: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
};
export type Lead = {
  id: string;
  date: string;
  stage: number;
  adsetId: string;
  creativeId: string;
  label: string;
};
export type Goal = {
  id: string;
  name: string;
  amount: number;
  metric: "revenue" | "operating" | "net";
  month: string;
};
export type History = {
  id: string;
  orderId: string;
  date: string;
  action: string;
};
export type Data = {
  settings: Settings;
  orders: Order[];
  entries: Entry[];
  adsets: Adset[];
  creatives: Creative[];
  traffic: Traffic[];
  leads: Lead[];
  goals: Goal[];
  history: History[];
};
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );
export const roundMoney = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100;
export const ratio = (n: number, d: number) => (d ? n / d : 0);
export const initialData = (): Data => {
  const adsets = Array.from({ length: 4 }, (_, i) => ({
    id: uid(),
    name: `Conjunto ${String(i + 1).padStart(2, "0")}`,
    budget: 20,
    active: true,
  }));
  return {
    settings: { ...defaults },
    orders: [],
    entries: [],
    adsets,
    creatives: adsets.flatMap((a) =>
      Array.from({ length: 4 }, (_, i) => ({
        id: uid(),
        adsetId: a.id,
        name: `Criativo ${i + 1} · ${a.name}`,
        url: "",
        date: today(),
        active: true,
      })),
    ),
    traffic: [],
    leads: [],
    goals: [],
    history: [],
  };
};
export function metrics(
  data: Data,
  from = "0000-00-00",
  to = "9999-99-99",
  adsetId?: string,
  creativeId?: string,
) {
  const inside = (date: string) => date >= from && date <= to;
  const es = data.entries.filter(
    (e) =>
      inside(e.date) &&
      (!adsetId || e.adsetId === adsetId) &&
      (!creativeId || e.creativeId === creativeId),
  );
  const ts = data.traffic.filter(
    (e) =>
      inside(e.date) &&
      (!adsetId || e.adsetId === adsetId) &&
      (!creativeId || e.creativeId === creativeId),
  );
  const sum = (kind: Entry["kind"]) =>
    roundMoney(
      es.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0),
    );
  const revenue = sum("shipping") + sum("product") + sum("income"),
    cost = sum("shipment"),
    ads = ts.reduce((s, t) => s + t.spend, 0) + sum("ads");
  const refunds = sum("refund"),
    expenses = sum("expense");
  const tax = es
    .filter(
      (e) =>
        e.kind === "expense" &&
        ["Impostos", "Taxas financeiras"].includes(e.category),
    )
    .reduce((s, e) => s + e.amount, 0);
  const shippingOrders = new Set(
    es.filter((e) => e.kind === "shipping").map((e) => e.orderId),
  ).size;
  const paid = new Set(
    es.filter((e) => e.kind === "product").map((e) => e.orderId),
  ).size;
  const sent = new Set(
    es.filter((e) => e.kind === "shipment").map((e) => e.orderId),
  ).size;
  const net = roundMoney(revenue - cost - ads - expenses - refunds);
  return {
    revenue,
    cost,
    ads,
    refunds,
    expenses,
    operating: net,
    preTax: net + tax,
    net,
    cpa: ratio(ads, shippingOrders),
    deliveryCpa: ratio(ads, paid),
    margin: ratio(net, revenue) * 100,
    roas: ratio(revenue, ads),
    shippingOrders,
    paid,
    sent,
    shipping: sum("shipping"),
    product: sum("product"),
    deliveryRate: ratio(paid, sent) * 100,
    orders: data.orders.filter(
      (o) =>
        inside(o.date) &&
        (!adsetId || o.adsetId === adsetId) &&
        (!creativeId || o.creativeId === creativeId),
    ).length,
    clicks: ts.reduce((s, t) => s + t.clicks, 0),
    impressions: ts.reduce((s, t) => s + t.impressions, 0),
    conversations: ts.reduce((s, t) => s + t.conversations, 0),
  };
}
export type Simulation = {
  orders: number;
  deliveryRate: number;
  price: number;
  shipping: number;
  cost: number;
  sets: number;
  budget: number;
  days: number;
  cpa: number;
  expenses: number;
  inverse: boolean;
};
export function simulate(x: Simulation) {
  const ads = x.sets * x.budget,
    orders = x.inverse ? ratio(ads, x.cpa) : x.orders,
    paid = (orders * x.deliveryRate) / 100,
    revenue = orders * x.shipping + paid * x.price,
    cost = orders * x.cost,
    profit = revenue - cost - ads - x.expenses;
  return {
    orders,
    paid,
    revenue,
    cost,
    ads,
    profit,
    monthly: profit * x.days,
    monthlyRevenue: revenue * x.days,
    margin: ratio(profit, revenue) * 100,
    totalOrders: orders * x.days,
    totalPaid: paid * x.days,
  };
}
export function recordOrderEvent(
  data: Data,
  order: Order,
  kind: "shipping" | "product" | "shipment",
  date: string,
): Data {
  if (data.entries.some((e) => e.orderId === order.id && e.kind === kind))
    throw new Error("Este lançamento já foi registrado.");
  if (
    kind === "product" &&
    !data.entries.some((e) => e.orderId === order.id && e.kind === "shipment")
  )
    throw new Error("Registre o despacho antes do pagamento na entrega.");
  const amount = roundMoney(
    kind === "shipping"
      ? order.shipping
      : kind === "product"
        ? order.price * order.quantity
        : order.cost * order.quantity,
  );
  if (amount <= 0) throw new Error("O valor precisa ser maior que zero.");
  const label = {
    shipping: "Frete confirmado",
    product: "Pagamento na entrega confirmado",
    shipment: "Pedido despachado",
  }[kind];
  return {
    ...data,
    orders: data.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status:
              kind === "shipping"
                ? "Frete pago"
                : kind === "product"
                  ? "Entregue e pago"
                  : "Enviado",
          }
        : o,
    ),
    entries: [
      ...data.entries,
      {
        id: uid(),
        orderId: order.id,
        eventKey: `${order.id}:${kind}`,
        date,
        kind,
        amount,
        category: label,
        description: `${label} · ${order.name}`,
        adsetId: order.adsetId,
        creativeId: order.creativeId,
      },
    ],
    history: [
      ...data.history,
      {
        id: uid(),
        orderId: order.id,
        date: new Date().toISOString(),
        action: label,
      },
    ],
  };
}
export function refundOrder(
  data: Data,
  order: Order,
  amount: number,
  date: string,
): Data {
  const received = data.entries
    .filter(
      (e) => e.orderId === order.id && ["shipping", "product"].includes(e.kind),
    )
    .reduce((s, e) => s + e.amount, 0);
  const refunded = data.entries
    .filter((e) => e.orderId === order.id && e.kind === "refund")
    .reduce((s, e) => s + e.amount, 0);
  if (amount <= 0 || roundMoney(amount) > roundMoney(received - refunded))
    throw new Error(
      "O reembolso deve ser positivo e não pode superar o saldo recebido.",
    );
  return {
    ...data,
    entries: [
      ...data.entries,
      {
        id: uid(),
        orderId: order.id,
        date,
        kind: "refund",
        amount,
        category: "Reembolsos",
        description: `Reembolso · ${order.name}`,
        adsetId: order.adsetId,
        creativeId: order.creativeId,
      },
    ],
    history: [
      ...data.history,
      {
        id: uid(),
        orderId: order.id,
        date: new Date().toISOString(),
        action: `Reembolso de ${money(amount)}`,
      },
    ],
  };
}
export function demoData(): Data {
  const d = initialData();
  for (let i = 0; i < 36; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - (i % 14));
    const date = dt.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const a = d.adsets[i % 4],
      c = d.creatives.filter((c) => c.adsetId === a.id)[i % 4];
    const o: Order = {
      id: uid(),
      name: `Cliente demonstração ${i + 1}`,
      phone: "",
      city: ["São Paulo", "Curitiba", "Recife"][i % 3],
      state: ["SP", "PR", "PE"][i % 3],
      zip: "",
      date,
      quantity: 1,
      price: 97,
      shipping: 29,
      cost: 29,
      source: "Meta Ads",
      adsetId: a.id,
      creativeId: c.id,
      tracking: "",
      status: "Novo pedido",
      notes: "Registro fictício do modo demonstração",
    };
    d.orders.push(o);
    if (i < 30) {
      Object.assign(d, recordOrderEvent(d, o, "shipping", date));
    }
    if (i < 27) Object.assign(d, recordOrderEvent(d, o, "shipment", date));
    if (i < 22) Object.assign(d, recordOrderEvent(d, o, "product", date));
  }
  for (let i = 0; i < 14; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    for (const a of d.adsets)
      d.traffic.push({
        id: uid(),
        date: dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
        adsetId: a.id,
        creativeId: "",
        spend: 16 + (i % 5),
        impressions: 800 + i * 12,
        clicks: 30 + i,
        conversations: 5 + (i % 4),
      });
  }
  return d;
}
