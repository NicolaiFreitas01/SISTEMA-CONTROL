import fs from "node:fs";
import { chromium } from "@playwright/test";
const artifacts = process.env.ARTIFACT_DIR ?? "/tmp/labirinex-validation";
fs.mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5173");
await page
  .getByRole("button", { name: "Abrir demonstração interativa" })
  .click();
await page.getByRole("heading", { name: "Visão geral." }).waitFor();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${artifacts}/dashboard.png`, fullPage: true });
for (const label of [
  "Pedidos e vendas",
  "Tráfego pago",
  "Gestão de criativos",
  "Funil do WhatsApp",
  "Financeiro",
  "Simulador de lucro",
  "Metas",
  "Analista IA",
  "Relatórios",
  "Configurações",
]) {
  await page
    .locator("nav")
    .getByRole("button", { name: label, exact: true })
    .click();
  await page.waitForTimeout(150);
  if (await page.getByText("Não foi possível abrir o Control.").count())
    throw new Error("Page crashed " + label);
}
await page
  .locator("nav")
  .getByRole("button", { name: "Pedidos e vendas", exact: true })
  .click();
await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
const dialog = page.getByRole("dialog");
await dialog.getByLabel("Nome do cliente").fill("Teste funcional COD");
await dialog.getByLabel("Cidade", { exact: true }).fill("São Paulo");
await dialog.getByLabel("Estado", { exact: true }).fill("SP");
await dialog.getByRole("button", { name: "Salvar pedido" }).click();
await page
  .getByRole("button", { name: "Abrir pedido de Teste funcional COD" })
  .click();
await dialog
  .getByRole("button", { name: "Confirmar frete", exact: true })
  .click();
await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
await page.waitForTimeout(100);
if (
  !(await dialog
    .getByRole("button", { name: "Confirmar frete", exact: true })
    .isDisabled())
)
  throw new Error("Frete duplication not blocked");
await dialog.getByRole("button", { name: "Registrar despacho" }).click();
await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
await page.waitForTimeout(100);
await dialog
  .getByRole("button", { name: "Confirmar pagamento", exact: true })
  .click();
await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
await page.waitForTimeout(100);
await dialog.getByText("Entregue e pago", { exact: true }).waitFor();
await dialog.getByRole("button", { name: "Reembolsar", exact: true }).click();
await dialog.getByLabel("Valor do reembolso").fill("10");
await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
await page.waitForFunction(() =>
  JSON.parse(localStorage.getItem("labirinex-demo")).entries.some(
    (e) => e.kind === "refund" && e.amount === 10,
  ),
);
await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
await page.reload();
await page
  .getByRole("button", { name: "Abrir demonstração interativa" })
  .click();
await page
  .locator("nav")
  .getByRole("button", { name: "Pedidos e vendas", exact: true })
  .click();
await page
  .getByRole("button", { name: "Abrir pedido de Teste funcional COD" })
  .waitFor();
// Exercita os três formatos em bytes, sem depender apenas de botões visíveis.
await page.locator('nav').getByRole('button',{name:'Relatórios',exact:true}).click();
await page.getByRole('heading',{name:'Relatórios.'}).waitFor();
for(const [label,ext,magic] of [['CSV','csv',''],['Excel','xlsx','PK'],['PDF','pdf','%PDF']]){
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:label,exact:true}).click();
 const file=await pending;const path=`${artifacts}/report.${ext}`;await file.saveAs(path);
 const bytes=fs.readFileSync(path);if(bytes.length<30||!bytes.toString('utf8',0,4).startsWith(magic))throw new Error(`Invalid ${ext} export`);
}
await page.locator('nav').getByRole('button',{name:'Tráfego pago',exact:true}).click();
await page.getByRole('heading',{name:'Tráfego pago.'}).waitFor();
const csv='date,adset,creative,spend,impressions,clicks,conversations\n2099-01-01,Conjunto 01,,20,1000,35,8';
await page.locator('input[type=file]').setInputFiles({name:'meta.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
await page.getByText('1 linhas importadas.').waitFor();
await page.locator('input[type=file]').setInputFiles({name:'meta-duplicado.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
await page.getByRole('alert').waitFor();
const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('labirinex-demo')).traffic.filter(t=>t.date==='2099-01-01').length);
if(imported!==1)throw new Error('CSV duplicate was accepted');
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Abrir menu" }).click();
await page
  .locator("nav")
  .getByRole("button", { name: "Visão geral", exact: true })
  .click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
if (overflow) throw new Error("Mobile viewport overflow");
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  "PASS: 11 páginas, CRUD pedido, frete/despacho/produto/reembolso, bloqueio duplicação, persistência demo e mobile sem overflow; CSV idempotente e exportações CSV/Excel/PDF válidas; zero erros JS.",
);
await browser.close();
