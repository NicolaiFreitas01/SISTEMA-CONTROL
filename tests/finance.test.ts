import { describe, it, expect } from "vitest";
import {
  simulate,
  initialData,
  recordOrderEvent,
  refundOrder,
  metrics,
  today,
  uid,
  type Order,
  type Simulation,
} from "../src/lib/domain";
const base: Simulation = {
  orders: 10,
  deliveryRate: 100,
  price: 97,
  shipping: 29,
  cost: 29,
  sets: 4,
  budget: 20,
  days: 30,
  cpa: 8,
  expenses: 0,
  inverse: false,
};
const order = (): Order => ({
  id: uid(),
  name: "Cliente de teste",
  phone: "",
  city: "São Paulo",
  state: "SP",
  zip: "",
  date: "2026-10-01",
  quantity: 1,
  price: 97,
  shipping: 29,
  cost: 29,
  source: "Meta Ads",
  adsetId: "",
  creativeId: "",
  tracking: "",
  status: "Novo pedido",
  notes: "",
});
describe("Exemplos financeiros obrigatórios", () => {
  it("10 pedidos / 10 entregas: R$ 890 por dia, R$ 26.700 por mês", () => {
    const s = simulate(base);
    expect(s.revenue).toBe(1260);
    expect(s.cost).toBe(290);
    expect(s.ads).toBe(80);
    expect(s.profit).toBe(890);
    expect(s.monthly).toBe(26700);
  });
  it("10 pedidos / 8 entregas: R$ 696 por dia, R$ 20.880 por mês", () => {
    const s = simulate({ ...base, deliveryRate: 80 });
    expect(s.revenue).toBe(1066);
    expect(s.cost).toBe(290);
    expect(s.profit).toBe(696);
    expect(s.monthly).toBe(20880);
  });
  it("nenhum pedido: receita zero, prejuízo de R$ 80", () => {
    const s = simulate({ ...base, orders: 0 });
    expect(s.revenue).toBe(0);
    expect(s.profit).toBe(-80);
    expect(s.margin).toBe(0);
  });
  it("modo inverso respeita investimento e CPA", () => {
    expect(simulate({ ...base, inverse: true, cpa: 16 }).orders).toBe(5);
    expect(simulate({ ...base, inverse: true, budget: 0 }).orders).toBe(0);
    expect(simulate({ ...base, inverse: true, cpa: 0 }).orders).toBe(0);
  });
});
describe("Livro financeiro COD", () => {
  it("não conta pedidos ou status como receita", () => {
    const d = initialData();
    d.orders = [{ ...order(), status: "Entregue e pago" }];
    expect(metrics(d).revenue).toBe(0);
  });
  it("registra frete, despacho e produto sem duplicar o custo", () => {
    let d = initialData();
    const o = order();
    d.orders = [o];
    d = recordOrderEvent(d, o, "shipping", "2026-10-01");
    d = recordOrderEvent(d, o, "shipment", "2026-10-02");
    d = recordOrderEvent(d, o, "product", "2026-10-03");
    expect(metrics(d).revenue).toBe(126);
    expect(metrics(d).cost).toBe(29);
    expect(metrics(d).net).toBe(97);
    expect(metrics(d).paid).toBe(1);
  });
  it("arredonda valores fracionários em centavos antes de gravar", () => {
    let d = initialData();
    const o = { ...order(), quantity: 3, cost: 0.1, price: 0.1 };
    d.orders = [o];
    d = recordOrderEvent(d, o, "shipment", today());
    expect(d.entries[0].amount).toBe(0.3);
  });
  it("rejeita confirmação financeira duplicada", () => {
    let d = initialData();
    const o = order();
    d.orders = [o];
    d = recordOrderEvent(d, o, "shipping", today());
    expect(() => recordOrderEvent(d, o, "shipping", today())).toThrow(
      "já foi registrado",
    );
  });
  it("não confirma pagamento na entrega antes de despachar", () => {
    const d = initialData(),
      o = order();
    d.orders = [o];
    expect(() => recordOrderEvent(d, o, "product", today())).toThrow(
      "despacho",
    );
  });
  it("respeita datas diferentes de recebimento e despacho", () => {
    let d = initialData();
    const o = order();
    d.orders = [o];
    d = recordOrderEvent(d, o, "shipping", "2026-10-01");
    d = recordOrderEvent(d, o, "shipment", "2026-10-02");
    d = recordOrderEvent(d, o, "product", "2026-10-10");
    expect(metrics(d, "2026-10-01", "2026-10-01").revenue).toBe(29);
    expect(metrics(d, "2026-10-02", "2026-10-02").net).toBe(-29);
    expect(metrics(d, "2026-10-10", "2026-10-10").revenue).toBe(97);
  });
  it("reembolso preserva receita bruta e reduz resultado líquido", () => {
    let d = initialData();
    const o = order();
    d.orders = [o];
    d = recordOrderEvent(d, o, "shipping", "2026-10-01");
    d = refundOrder(d, o, 10, "2026-10-04");
    expect(metrics(d).revenue).toBe(29);
    expect(metrics(d).net).toBe(19);
    expect(() => refundOrder(d, o, 20, "2026-10-05")).toThrow("saldo recebido");
  });
  it("quantidade multiplica produto e custo, sem multiplicar frete total", () => {
    let d = initialData();
    const o = { ...order(), quantity: 3 };
    d.orders = [o];
    for (const k of ["shipping", "shipment", "product"] as const)
      d = recordOrderEvent(d, o, k, today());
    expect(metrics(d).revenue).toBe(320);
    expect(metrics(d).cost).toBe(87);
  });
  it("separa orçamento de gasto real e impostos de resultado operacional", () => {
    const d = initialData();
    expect(metrics(d).ads).toBe(0);
    d.traffic.push({
      id: uid(),
      date: today(),
      adsetId: d.adsets[0].id,
      creativeId: "",
      spend: 80,
      impressions: 1000,
      clicks: 20,
      conversations: 5,
    });
    d.entries.push({
      id: uid(),
      date: today(),
      kind: "expense",
      amount: 10,
      category: "Impostos",
      description: "Imposto",
    });
    expect(metrics(d).ads).toBe(80);
    expect(metrics(d).preTax).toBe(-80);
    expect(metrics(d).operating).toBe(-90);
    expect(metrics(d).net).toBe(-90);
    expect(metrics(d).cpa).toBe(0);
  });
});
