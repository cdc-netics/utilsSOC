import { test, expect, Page } from "@playwright/test";
import { findFirstCsvInDataFolder, readBotnetStyleCsv } from "../utils/csv";
import { writeResultsCsv, LoginResult } from "../utils/reporters";
import { SELECTORS } from "../utils/selectors";

const OUT_SUCCESS = "reports/login_success.csv";
const OUT_FAILED = "reports/login_failed.csv";

// -------------------------
// Validaciones previas (QA/SOC)
// -------------------------
function looksLikeEmail(user: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.trim());
}

function normalizeRutInput(raw: string): string {
  // Deja solo dígitos + K/k, y agrega guion antes del DV si hace falta.
  // Soporta: 11111111, 1111111-1, 11111111-1, 1.111.111-1, 11111111-k, 1111111k
  const v = raw.trim().replace(/\./g, "").replace(/\s+/g, "");

  // Si ya viene con guion y DV:
  if (/^\d{7,8}-[0-9kK]$/.test(v)) return v;

  // Si viene sin guion pero con DV al final (ej 11111111k o 11111111K)
  if (/^\d{7,8}[0-9kK]$/.test(v)) {
    return `${v.slice(0, -1)}-${v.slice(-1)}`;
  }

  // Si viene solo números (sin DV) -> inválido para login del portal
  return v;
}

function isRutAcceptableForPortal(raw: string): { ok: boolean; rut: string; reason?: string } {
  const user = raw.trim();

  if (!user) return { ok: false, rut: "", reason: "User vacío" };
  if (looksLikeEmail(user)) return { ok: false, rut: "", reason: "User es email (se requiere RUT)" };

  const normalized = normalizeRutInput(user);

  // Requisito mínimo: 7-8 dígitos + '-' + DV
  if (!/^\d{7,8}-[0-9kK]$/.test(normalized)) {
    return { ok: false, rut: "", reason: `Formato RUT inválido: "${raw}"` };
  }

  return { ok: true, rut: normalized };
}

function isValidClaveWeb(clave: string): boolean {
  return /^\d{6}$/.test(clave.trim());
}

// -------------------------
// Acciones de UI
// -------------------------
async function attemptLogin(page: Page, rut: string, clave: string): Promise<{ ok: boolean; reason: string }> {
  await page.goto(SELECTORS.loginUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  // Inputs por Role + Name (como pediste)
  const rutInput = page.getByRole("textbox", { name: SELECTORS.rutTextboxRoleName.name });
  const claveInput = page.getByRole("textbox", { name: SELECTORS.claveTextboxRoleName.name });
  const loginBtn = page.getByRole("button", { name: SELECTORS.loginButtonRoleName.name });

  await expect(rutInput, "No se encontró el input '* RUT:'").toBeVisible();
  await expect(claveInput, "No se encontró el input '* Clave web:'").toBeVisible();

  // Fill
  await rutInput.fill(rut);
  await page.waitForTimeout(900);

  await claveInput.fill(clave);
  await page.waitForTimeout(900);

  // El botón se habilita con ambos campos completos
  await expect(loginBtn, "Botón 'Iniciar sesión' no visible").toBeVisible();
  await expect(loginBtn, "Botón 'Iniciar sesión' debería estar habilitado").toBeEnabled({ timeout: 10_000 });

  await loginBtn.click();
  await page.waitForTimeout(900);

  // Señales: éxito (URL + 'Resumen') / fallo (mensaje)
  const invalidMsg = page.getByText(SELECTORS.invalidDataText, { exact: true }).first();
  const resumen = page.getByText(SELECTORS.successTextResumen, { exact: true }).first();

  const winner = await Promise.race([
    page.waitForURL(SELECTORS.successUrl, { timeout: 15_000 }).then(() => "SUCCESS").catch(() => null),
    resumen.waitFor({ state: "visible", timeout: 15_000 }).then(() => "SUCCESS").catch(() => null),
    invalidMsg.waitFor({ state: "visible", timeout: 15_000 }).then(() => "FAILED").catch(() => null),
  ]);

  if (winner === "SUCCESS") return { ok: true, reason: `Login exitoso (url=${page.url()})` };
  if (winner === "FAILED") return { ok: false, reason: `Mensaje UI: "${SELECTORS.invalidDataText}"` };

  return { ok: false, reason: "Timeout: sin señal clara de éxito/fallo" };
}

async function doLogout(page: Page) {
  // Abre menú de usuario (avatar)
  const avatar = page.locator(SELECTORS.avatarTriggerCss).first();
  await expect(avatar, "No se encontró el avatar/trigger de menú usuario").toBeVisible({ timeout: 15_000 });

  await avatar.click();
  await page.waitForTimeout(900);

  // En algunos AntD el menú incluye un item "Cerrar sesión"
  const logoutText = page.getByText(/Cerrar sesión|Cerrar Sesión/i).first();
  if (await logoutText.isVisible().catch(() => false)) {
    await logoutText.click().catch(() => {});
    await page.waitForTimeout(900);
  }

  // Confirmación
  const confirmText = page.getByText(SELECTORS.confirmLogoutTextPartial, { exact: true }).first();
  await expect(confirmText, "No apareció el popup de confirmación de logout").toBeVisible({ timeout: 15_000 });

  const confirmBtn = page.getByRole("button", { name: SELECTORS.confirmLogoutButtonRoleName.name }).first();
  await expect(confirmBtn, "No se encontró el botón 'Cerrar sesión' del popup").toBeVisible({ timeout: 15_000 });

  await confirmBtn.click();
  await page.waitForTimeout(900);

  await expect(page).toHaveURL(SELECTORS.loginUrl, { timeout: 10_000 });
}

// -------------------------
// TEST
// -------------------------
test("AFP Modelo - Login desde CSV con reportes success/fail", async ({ page }) => {
  const successResults: LoginResult[] = [];
  const failedResults: LoginResult[] = [];

  const csvPath = findFirstCsvInDataFolder("data");
  const rows = readBotnetStyleCsv(csvPath);

  console.log(`[CSV] Archivo: ${csvPath}`);
  console.log(`[CSV] Filas leídas: ${rows.length}`);

  for (const row of rows) {
    const timestamp = new Date().toISOString();
    const user = row.userRaw;
    const pass = row.passwordRaw;

    // 1) Validar RUT (User)
    const rutCheck = isRutAcceptableForPortal(user);
    if (!rutCheck.ok) {
      failedResults.push({
        timestamp,
        botnet_id: row.botnetId,
        discovery_date: row.discoveryDate,
        url_from_csv: row.urlFromCsv,
        user_raw: user,
        rut_used: "",
        outcome: "FAILED",
        reason: `Valor erróneo: ${rutCheck.reason}`,
      });
      continue;
    }

    // 2) Validar clave web (6 números)
    if (!isValidClaveWeb(pass)) {
      failedResults.push({
        timestamp,
        botnet_id: row.botnetId,
        discovery_date: row.discoveryDate,
        url_from_csv: row.urlFromCsv,
        user_raw: user,
        rut_used: rutCheck.rut,
        outcome: "FAILED",
        reason: `Valor erróneo: clave web inválida (se requieren 6 números). Recibido="${pass}"`,
      });
      continue;
    }

    // 3) Intentar login
    try {
      const result = await attemptLogin(page, rutCheck.rut, pass);

      if (result.ok) {
        successResults.push({
          timestamp,
          botnet_id: row.botnetId,
          discovery_date: row.discoveryDate,
          url_from_csv: row.urlFromCsv,
          user_raw: user,
          rut_used: rutCheck.rut,
          outcome: "SUCCESS",
          reason: result.reason,
        });

        // 4) Logout para evitar estado sucio
        await doLogout(page);
      } else {
        failedResults.push({
          timestamp,
          botnet_id: row.botnetId,
          discovery_date: row.discoveryDate,
          url_from_csv: row.urlFromCsv,
          user_raw: user,
          rut_used: rutCheck.rut,
          outcome: "FAILED",
          reason: result.reason,
        });

        // Limpieza defensiva
        await page.goto(SELECTORS.loginUrl, { waitUntil: "domcontentloaded" }).catch(() => {});
        await page.waitForTimeout(900);
      }

    } catch (err: any) {
      failedResults.push({
        timestamp,
        botnet_id: row.botnetId,
        discovery_date: row.discoveryDate,
        url_from_csv: row.urlFromCsv,
        user_raw: user,
        rut_used: rutCheck.rut,
        outcome: "FAILED",
        reason: `Excepción controlada: ${String(err?.message || err)}`,
      });

      // Limpieza defensiva
      await page.goto(SELECTORS.loginUrl, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(900);
    }
  }

  // Reportes
  writeResultsCsv(successResults, OUT_SUCCESS);
  writeResultsCsv(failedResults, OUT_FAILED);

  // Validación final de ejecución (QA)
  expect(rows.length).toBeGreaterThan(0);
  expect(successResults.length + failedResults.length).toBe(rows.length);
});