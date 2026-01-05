import { test, expect } from '@playwright/test';
import fs from 'fs';

test.setTimeout(0);

test('test de usuarios - Sitio Postulaciones', async ({ page }) => {

  const csv = fs.readFileSync('dataPaloma-2.csv', 'utf-8').trim();
  
  const lines = csv.split('\n');
  
  const dataRows = lines.slice(1);


  for (const row of dataRows) {
    const [botnetId, url, user, password,  isEmployee, status, discoveryDate, relatedAlarm ] = row.split(',');
    const user_web = user.replaceAll('"', '').trim();
    const pass_web = password.replaceAll('"', '').trim();

    await page.goto('https://postulaciones.pjud.cl/postulacionessrh/servlet/com.postulaciones.login', {waitUntil: 'networkidle' });
    await page.getByRole('textbox', { name: 'Rut Usu' }).click();
    await page.getByRole('textbox', { name: 'Rut Usu' }).fill(user_web);
    //await page.getByRole('textbox', { name: 'Rut Usu' }).fill('23831266');
    await page.getByRole('textbox', { name: 'Pas Usu' }).click();
    await page.getByRole('textbox', { name: 'Pas Usu' }).fill(pass_web);
    //await page.getByRole('textbox', { name: 'Pas Usu' }).fill('54321Millaray$');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
       
    try {

      const msg = await page.getByRole('heading', { name: 'Contraseña Incorrecta' }).waitFor({ timeout: 3000 });
      const msgText = await page.getByRole('heading', { name: 'Contraseña Incorrecta' }).textContent();
      console.log('Texto del mensaje:', msgText, 'Usuario:', user_web);
      fs.appendFileSync('pjud-no-logeados.csv', row + '\n', { encoding: 'utf-8' });
    
    } catch (error) {
      //Para los no registrados
      const notRegistered = page.getByRole('heading', { name: 'Usuario no registrado' });
      if (await notRegistered.isVisible({ timeout: 2000 })) {
          console.log(`USUARIO NO REGISTRADO: ${user_web}`);
          fs.appendFileSync('pjud-no-registrados.csv', row + '\n', { encoding: 'utf-8' });
          continue;
      }

      // cuando si se logra logear
      console.log(`Login exitoso para el usuario: ${user_web}`);

      await page.locator('#DDO_ADMINAG_MPAGEContainer_btnGroupDrop').click();
      await page.locator('#DDO_ADMINAG_MPAGEContainer').getByRole('link', { name: ' Cerrar Sesión' }).click(); 
      fs.appendFileSync('pjud-logeados.csv', row + '\n', { encoding: 'utf-8' });
      continue;
    }
    
  }
});
