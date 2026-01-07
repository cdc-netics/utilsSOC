import { test, expect } from '@playwright/test';
import fs from 'fs';

test.setTimeout(0);

test('oficina Judicial - Causas ', async ({ page }) => {

  const csv = fs.readFileSync('dataPJUD-Causas.csv', 'utf-8').trim();
  const lines = csv.split('\n');
  const dataRows = lines.slice(1);

  for (const row of dataRows) {
    const [botnetId, url, user, password,  isEmployee, status, discoveryDate, relatedAlarm ] = row.split(',');
    const user_web = user.replace(/[".-]/g, '').trim();
    const pass_web = password.replaceAll('"', '').trim();

    await page.goto('https://oficinajudicialvirtual.pjud.cl/home/index.php');
    await page.getByRole('button', { name: 'Todos los servicios' }).click();
    await page.getByRole('link', { name: 'Clave Poder Judicial' }).click();
    await page.getByPlaceholder('Ingrese su Rut sin dígito').click();
    await page.getByPlaceholder('Ingrese su Rut sin dígito').fill(user_web);
    await page.getByLabel('Contraseña').fill(pass_web);
    //Este se logea y pide cambio de pass
    //await page.getByPlaceholder('Ingrese su Rut sin dígito').fill('144424808');
    //await page.getByLabel('Contraseña').fill('w.FF7Jqt#Cxg');

    await page.getByText('Ingresar').click();

    await page.waitForTimeout(5000);
    const expiredHeading = page.getByRole('heading', { name: 'Clave expirada' });

      if (await expiredHeading.count() > 0) {
          //Saldra mensaje de clave expirada cuando se logee
          console.log('------>Clave expirada detectada - Login EXITOSO - user: ', user_web);
          fs.appendFileSync('pjud-CAUSAS-logeados.csv', row + '\n', { encoding: 'utf-8' });
      } else {
        // saldra pop up indicando clave invalida
        page.once('dialog', dialog => {
            console.log(`Pop-up mostrado: ${dialog.message()}`);
            dialog.dismiss().catch(() => {});
          });
        console.log('------> Clave INCORRECTA - user: ', user_web);
        fs.appendFileSync('pjud-CAUSAS-no-logeados.csv', row + '\n', { encoding: 'utf-8' });
      }
  }
});
