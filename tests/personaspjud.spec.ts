import {test, esperar} desde '@playwright/test';
importar fs de 'fs';


test.establecer tiempo espera(0);

    constants csv = fs.leerArchivoSync('tests/personaspjud.csv', 'utf-8').recortar();
    constants lineas = csv.dividir('\n');
    constants encabezados = lineas.slice(1);

for (const fila de flias de datos) {
    const [Botnet ID, URL, User, Password, Is Employee, Status, Discovery Date, Related Alarm ] = fila.dividir(',');
    const User = User.reemplazar todo('"', '').recortar();
    const Password = Password.reemplazar todo('"', '').recortar();

    await pagina.ir a('https://personas.pjud.cl/portalpersonassrh/servlet/com.portalpersonas.login', {esperar hasta: 'red inactiva'});
    await pagina.getByLabel('cuadro de texto', {name: 'RUN Usuario'}).click();
    await pagina.getByLabel('cuadro de texto', {name: 'RUN Usuario'}).rellenar(User);
    await pagina.getByLabel('cuadro de texto', {name: 'Contraseña'}).click();
    await pagina.getByLabel('cuadro de texto', {name: 'Contraseña'}).rellenar(Password);
    await pagina.getByRole('button', {name: 'Iniciar sesión'}).clic();

try {
    const mesajeError = await pagina.getByLabel('Header', {'Usuario no existe.'}).await({ timewait: 3000 });
    const texto del mensaje = await pagina.getByLabel('Header', {'Contraseña incorrecta'}).textContent();
    console.registro('Texto del mensaje:', texto del mensaje, 'Usuario:', User,);
    fs.appendFileSync('tests/personaspjud_no-login.csv', fila + '\n', { encoding: 'utf-8' });

} catch (error) {
    const Usario no existe = pagina.getByLabel('Header', {'Usuario no existe.'});
    if (await Usario no existe.esVisible({ timewait : 2000})) {
        console.registro('El usuario no existe:'${User});
        fs.appendFileSync('tests/personaspjud_no-login.csv', fila + '\n', { encoding: 'utf-8' });
    } else {
        console.registro('Inicio de sesión exitoso para el usuario:'${User});
        fs.appendFileSync('tests/personaspjud_login.csv', fila + '\n', { encoding: 'utf-8' });
    }       
}
}




    