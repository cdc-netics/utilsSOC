import { test, expect, Page } from '@playwright/test';
import fs from 'fs';


//MATI QL!!!!

const LOGIN_URL =
  'https://personas.pjud.cl/portalpersonassrh/servlet/com.portalpersonas.login';

const CSV_IN = 'tests/personaspjud.csv';
const OUT_LOGIN = 'tests/personaspjud_login.csv';
const OUT_NO_LOGIN = 'tests/personaspjud_no-login.csv';

// Mensajes de error que indican que NO hubo login
const ERROR_MESSAGES = ['Cuenta no existe', 'Contraseña incorrecta'];

type Attempt = { ok: boolean; reason: string };

async function attemptLogin(page: Page, user: string, password: string): Promise<Attempt> {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

  await page.getByRole('textbox', { name: 'RF' }).fill(user);
  await page.getByRole('textbox', { name: 'PASUSU' }).fill(password);
  // Hay dos botones con value "Iniciar sesión":
  //   #BTNBCU  -> redirige a ClaveÚnica (SSO), NO usa RF/PASUSU.
  //   #BTNENTER (title "Confirmar") -> envía el formulario RF/PASUSU. Este es el nuestro.
  //await page.locator('#BTNENTER').click();
  await page.getByTitle('Confirmar').click();

  // Señal de fallo: aparece cualquiera de los mensajes de error.
  const errorLocator = page.getByText(new RegExp(ERROR_MESSAGES.join('|'), 'i')).first();

  const failed = await errorLocator
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(async () => (await errorLocator.textContent())?.trim() || 'Error de credenciales')
    .catch(() => null);

  if (failed) {
    return { ok: false, reason: failed };
  }

  // Señal de éxito: salimos de la página de login hacia el portal
  // (NO contamos una redirección al SSO de ClaveÚnica como login válido).
  const success = await page
    .waitForURL(
      (url) =>
        !url.href.includes('com.portalpersonas.login') &&
        !url.hostname.includes('claveunica.gob.cl'),
      { timeout: 8000 }
    )
    .then(() => true)
    .catch(() => false);

  if (success) {
    return { ok: true, reason: `Login exitoso (url=${page.url()})` };
  }

  return { ok: false, reason: 'Sin señal clara de éxito/fallo (timeout)' };
}

test.setTimeout(0);

test('Personas PJUD - Login desde CSV', async ({ page }) => {
  const csv = fs.readFileSync(CSV_IN, 'utf-8').trim();
  const lines = csv.split(/\r?\n/);
  const header = lines[0];
  const dataRows = lines.slice(1).filter((r: string) => r.trim().length > 0);

  // Reiniciamos los archivos de salida con la cabecera original.
  fs.writeFileSync(OUT_LOGIN, header + '\n', 'utf-8');
  fs.writeFileSync(OUT_NO_LOGIN, header + '\n', 'utf-8');

  let okCount = 0;
  let noCount = 0;

  for (const row of dataRows) {
    const [, User, Password] = row.split(';');
    const user = (User ?? '').replaceAll('"', '').trim();
    const password = (Password ?? '').replaceAll('"', '').trim();

    if (!user || !password) {
      console.log('Fila inválida (usuario/clave vacíos):', row);
      fs.appendFileSync(OUT_NO_LOGIN, row + '\n', 'utf-8');
      noCount++;
      continue;
    }

    let result: Attempt;
    try {
      result = await attemptLogin(page, user, password);
    } catch (err) {
      result = { ok: false, reason: `Excepción: ${(err as Error).message}` };
    }

    if (result.ok) {
      console.log('✅ Login OK:', user, '-', result.reason);
      fs.appendFileSync(OUT_LOGIN, row + '\n', 'utf-8');
      okCount++;
    } else {
      console.log('❌ Sin login:', user, '-', result.reason);
      fs.appendFileSync(OUT_NO_LOGIN, row + '\n', 'utf-8');
      noCount++;
    }
  }

  console.log(`\nResumen -> con login: ${okCount} | sin login: ${noCount} | total: ${dataRows.length}`);
  expect(okCount + noCount).toBe(dataRows.length);
});
