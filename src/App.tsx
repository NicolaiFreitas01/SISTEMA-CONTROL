import { useState, useEffect, lazy, Suspense, type FormEvent } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import {
  LayoutDashboard,
  ShoppingBag,
  MousePointer2,
  Clapperboard,
  MessageCircle,
  Wallet,
  Calculator,
  Flag,
  Sparkles,
  FileChartColumn,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  LogOut,
  Hexagon,
  Command,
  Plus,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "./lib/store";
import { supabase } from "./lib/supabase";
import { today } from "./lib/domain";
import { Button, Field, Badge, Modal } from "./components/ui";
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Orders = lazy(() =>
  import("./pages/Orders").then((m) => ({ default: m.Orders })),
);
const Simulator = lazy(() =>
  import("./pages/Simulator").then((m) => ({ default: m.Simulator })),
);
const Marketing = lazy(() =>
  import("./pages/Marketing").then((m) => ({ default: m.Marketing })),
);
const Finance = lazy(() =>
  import("./pages/Finance").then((m) => ({ default: m.Finance })),
);
const Funnel = lazy(() =>
  import("./pages/Business").then((m) => ({ default: m.Funnel })),
);
const Goals = lazy(() =>
  import("./pages/Business").then((m) => ({ default: m.Goals })),
);
const SettingsPage = lazy(() =>
  import("./pages/Business").then((m) => ({ default: m.SettingsPage })),
);
const Reports = lazy(() =>
  import("./pages/Reports").then((m) => ({ default: m.Reports })),
);
const Analyst = lazy(() =>
  import("./pages/Reports").then((m) => ({ default: m.Analyst })),
);

const nav = [
  ["dashboard", "Visão geral", LayoutDashboard],
  ["orders", "Pedidos e vendas", ShoppingBag],
  ["traffic", "Tráfego pago", MousePointer2],
  ["creatives", "Gestão de criativos", Clapperboard],
  ["funnel", "Funil do WhatsApp", MessageCircle],
  ["finance", "Financeiro", Wallet],
  ["simulator", "Simulador de lucro", Calculator],
  ["goals", "Metas", Flag],
  ["ai", "Analista IA", Sparkles],
  ["reports", "Relatórios", FileChartColumn],
  ["settings", "Configurações", Settings],
] as const;
function Login() {
  const { enterDemo } = useStore(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const result = register
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setMessage(
      result.error
        ? result.error.message
        : register
          ? "Cadastro solicitado. Confira a confirmação no seu e-mail."
          : "Login realizado.",
    );
    setLoading(false);
  }
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Hexagon size={24} />
          </span>
          <div>
            LABIRINEX<small>CONTROL</small>
          </div>
        </div>
        <Badge tone="positive">GESTÃO INTELIGENTE PARA COD</Badge>
        <h1>
          Mais controle.
          <br />
          Mais clareza.
          <br />
          <em>Mais resultado.</em>
        </h1>
        <p>
          Pedidos, anúncios e finanças no mesmo lugar.
          <br />
          Conheça o resultado real da sua operação.
        </p>
        <div className="login-visual">
          <span>
            R$ 126<span>receita por entrega paga</span>
          </span>
          <i />
          <span>
            R$ 29<span>produto + envio</span>
          </span>
          <i />
          <span className="positive-text">
            R$ 97<span>margem antes de anúncios</span>
          </span>
        </div>
        <small>LABIRINEX CONTROL · Inteligência para crescer</small>
      </section>
      <section className="login-form">
        <Badge>SEU CENTRO DE COMANDO</Badge>
        <h2>{register ? "Crie sua conta" : "Bem-vindo de volta"}</h2>
        <p>Acesse sua operação com segurança.</p>
        {supabase ? (
          <form onSubmit={submit}>
            <Field label="E-mail">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                minLength={8}
                autoComplete={register ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button disabled={loading}>
              {loading
                ? "Aguarde..."
                : register
                  ? "Criar conta"
                  : "Entrar na minha conta"}{" "}
              <ArrowUpRight size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRegister(!register)}
            >
              {register ? "Já tenho uma conta" : "Criar conta"}
            </Button>
            {message && <p role="status">{message}</p>}
          </form>
        ) : (
          <div className="notice">
            <ShieldCheck size={20} />
            <div>
              <strong>Conecte seu Supabase para começar</strong>
              <p>
                O banco real ainda não está configurado. Siga o guia no README e
                aplique a migração SQL para habilitar login e dados protegidos.
              </p>
            </div>
          </div>
        )}
        <div className="login-divider">
          <span>ou explore antes</span>
        </div>
        <Button variant="outline" onClick={enterDemo}>
          Abrir demonstração interativa <ArrowUpRight size={16} />
        </Button>
        <p className="micro">
          Ambiente separado com dados fictícios. Nenhum registro é enviado para
          uma conta real.
        </p>
      </section>
    </main>
  );
}
export default function App() {
  const { demo, session, data, busy, error, exit, ready } = useStore();
  const [page, setPage] = useState(() => location.hash.slice(1) || "dashboard"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [period, setPeriod] = useState("30"),
    [from, setFrom] = useState(
      format(subDays(new Date(`${today()}T12:00:00`), 29), "yyyy-MM-dd"),
    ),
    [to, setTo] = useState(today()),
    [newOpen, setNewOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(false);
  useEffect(() => {
    const fn = () => setPage(location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const navigate = (p: string) => {
    location.hash = p;
    setPage(p);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  function changePeriod(v: string) {
    setPeriod(v);
    const now = new Date(`${today()}T12:00:00`);
    if (v === "custom") return;
    const end = v === "yesterday" ? subDays(now, 1) : now;
    setTo(format(end, "yyyy-MM-dd"));
    setFrom(
      format(
        v === "month"
          ? startOfMonth(now)
          : v === "today" || v === "yesterday"
            ? end
            : subDays(now, Number(v) - 1),
        "yyyy-MM-dd",
      ),
    );
  }
  if (!demo && !session) return <Login />;
  if (!demo && !ready)
    return (
      <main className="fatal">
        <h1>Carregando sua operação…</h1>
        <p>{error || "Validando acesso aos dados da conta."}</p>
        {error && (
          <Button onClick={() => location.reload()}>Tentar novamente</Button>
        )}
      </main>
    );
  const title = nav.find((n) => n[0] === page)?.[1] ?? "Visão geral";
  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-nav-open" : ""}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={() => navigate("dashboard")}
        >
          <span className="brand-icon">
            <Hexagon size={23} />
            <i />
          </span>
          <div>
            LABIRINEX<small>CONTROL</small>
          </div>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">L</span>
          <div>
            <strong>{data.settings.product}</strong>
            <small>Operação Cash on Delivery</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map(([id, label, Icon], i) => (
            <div key={id}>
              {i === 5 && (
                <span className="nav-label">INTELIGÊNCIA & FINANÇAS</span>
              )}
              {i === 10 && <div className="nav-divider" />}
              <button
                title={label}
                aria-label={label}
                className={`nav-item ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === "ai" && <b className="new-tag">IA</b>}
                {id === "orders" && data.orders.length > 0 && (
                  <b className="nav-count">{data.orders.length}</b>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <span className="mini-dot" />
            <span>{demo ? "Demonstração local" : "Supabase conectado"}</span>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} /> Recolher menu
              </>
            )}
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Fechar menu"
          className="mobile-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </Button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Buscar no Control</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-separator" />
            <button
              className="notification-btn"
              aria-label="Notificações"
              onClick={() => setNotice(true)}
            >
              <Bell size={18} />
              <i />
            </button>
            <button className="profile" onClick={exit} title="Sair da conta">
              <span>
                {demo ? "D" : (session?.user.email?.[0].toUpperCase() ?? "L")}
              </span>
              <div>
                <strong>
                  {demo
                    ? "Modo demonstração"
                    : session?.user.email?.split("@")[0]}
                </strong>
                <small>Administrador</small>
              </div>
              <LogOut size={14} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="mini-dot" /> DEMONSTRAÇÃO · Dados fictícios,
              salvos apenas neste navegador
            </span>
            <button onClick={exit}>
              Voltar ao login <ArrowUpRight size={12} />
            </button>
          </div>
        )}
        <main className="main-content">
          <div className="context-bar">
            <span className="context-label">
              <span className="mini-dot" />{" "}
              {demo ? "Explorando a operação" : "Dados da sua operação"}{" "}
              <span className="context-muted">· Cash on Delivery</span>
            </span>
            <div className="date-controls">
              <select
                aria-label="Período"
                value={period}
                onChange={(e) => changePeriod(e.target.value)}
              >
                {[
                  ["today", "Hoje"],
                  ["yesterday", "Ontem"],
                  ["7", "Últimos 7 dias"],
                  ["15", "Últimos 15 dias"],
                  ["30", "Últimos 30 dias"],
                  ["month", "Mês atual"],
                  ["custom", "Personalizado"],
                ].map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
              {period === "custom" ? (
                <>
                  <input
                    type="date"
                    aria-label="Data inicial"
                    value={from}
                    max={to}
                    onChange={(e) =>
                      e.target.value &&
                      e.target.value <= to &&
                      setFrom(e.target.value)
                    }
                  />
                  <input
                    type="date"
                    aria-label="Data final"
                    value={to}
                    min={from}
                    onChange={(e) =>
                      e.target.value &&
                      e.target.value >= from &&
                      setTo(e.target.value)
                    }
                  />
                </>
              ) : (
                <span className="date-range">
                  {from.split("-").reverse().join("/")} <span>—</span>{" "}
                  {to.split("-").reverse().join("/")}
                </span>
              )}
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {busy && (
            <div className="saving" role="status">
              Sincronizando…
            </div>
          )}
          <Suspense
            fallback={
              <div className="panel loading-page" role="status">
                Carregando módulo…
              </div>
            }
          >
            {page === "dashboard" ? (
              <Dashboard
                from={from}
                to={to}
                navigate={navigate}
                onNew={() => {
                  navigate("orders");
                  setNewOpen(true);
                }}
              />
            ) : page === "orders" ? (
              <>
                <div className="floating-action">
                  <Button onClick={() => setNewOpen(true)}>
                    <Plus size={16} /> Novo pedido
                  </Button>
                </div>
                <Orders
                  from={from}
                  to={to}
                  newOpen={newOpen}
                  onCloseNew={() => setNewOpen(false)}
                />
              </>
            ) : page === "traffic" ? (
              <Marketing from={from} to={to} />
            ) : page === "creatives" ? (
              <Marketing key="creatives" creative from={from} to={to} />
            ) : page === "funnel" ? (
              <Funnel from={from} to={to} />
            ) : page === "finance" ? (
              <Finance from={from} to={to} />
            ) : page === "simulator" ? (
              <Simulator />
            ) : page === "goals" ? (
              <Goals />
            ) : page === "ai" ? (
              <Analyst from={from} to={to} />
            ) : page === "reports" ? (
              <Reports from={from} to={to} />
            ) : page === "settings" ? (
              <SettingsPage />
            ) : (
              <Dashboard
                from={from}
                to={to}
                navigate={navigate}
                onNew={() => {
                  navigate("orders");
                  setNewOpen(true);
                }}
              />
            )}
          </Suspense>
          <footer>
            <span>
              LABIRINEX CONTROL <b>·</b> Clareza para crescer.
            </span>
            <span>Valores em BRL · Eventos por data efetiva</span>
          </footer>
        </main>
      </div>
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Buscar no Control"
      >
        <div className="search">
          <Search size={18} />
          <input
            autoFocus
            placeholder="Digite uma página ou cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="search-results">
          {nav
            .filter((n) => n[1].toLowerCase().includes(search.toLowerCase()))
            .map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  navigate(id);
                  setSearchOpen(false);
                }}
              >
                <Icon size={17} />
                {label}
                <ArrowUpRight size={14} />
              </button>
            ))}
          {search &&
            data.orders
              .filter((o) =>
                o.name.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, 5)
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    navigate("orders");
                    setSearchOpen(false);
                  }}
                >
                  <ShoppingBag size={17} />
                  {o.name} · {o.status}
                </button>
              ))}
        </div>
      </Modal>
      <Modal
        open={notice}
        onClose={() => setNotice(false)}
        title="Central de acompanhamento"
      >
        <p>
          Os alertas financeiros aparecem no Radar do negócio, no dashboard,
          conforme o período selecionado.
        </p>
        <p className="micro">
          Os limites de CPA, atrasos e devoluções podem ser ajustados em
          Configurações.
        </p>
        <Button
          onClick={() => {
            navigate("dashboard");
            setNotice(false);
          }}
        >
          Ver radar <ArrowUpRight size={15} />
        </Button>
      </Modal>
    </div>
  );
}
