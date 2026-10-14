# Historia Quiz

Juego de preguntas de historia universal para partidas multijugador en tiempo real.

## Requisitos
- Node.js 18 o superior
- Una conexión a internet para publicar y jugar con otras personas

## Probar en tu computadora
1. Instala Node.js desde https://nodejs.org/
2. Descomprime el ZIP y abre una terminal dentro de la carpeta `historia_quiz`.
3. Ejecuta `npm install`.
4. Ejecuta `npm start`.
5. Abre `http://localhost:3000`.

Para probar el modo multijugador local, abre la dirección en dos pestañas o dispositivos conectados a la misma red. Para jugar por internet, sigue los pasos de publicación.

## Publicar gratis en Render
1. Crea una cuenta en https://github.com/ y otra en https://render.com/.
2. En GitHub, crea un repositorio nuevo llamado `historia-quiz`.
3. Sube al repositorio `server.js`, `package.json` y la carpeta `public` completa.
4. En Render, elige **New +** → **Web Service** y conecta tu repositorio.
5. Configura:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Pulsa **Create Web Service** y espera a que termine el despliegue.
7. Render te dará una dirección pública parecida a `https://historia-quiz-xxxx.onrender.com`. Comparte esa dirección con todos los jugadores.
8. El anfitrión abre la web, pulsa **Crear sala** y comparte el código de cuatro caracteres. Los demás abren el mismo enlace, escriben su nombre y el código, y pulsan **Entrar al juego**.

## Cómo funciona
- 10 preguntas de historia universal.
- 20 segundos por pregunta.
- Puntuación por respuesta correcta con bonificación por rapidez.
- Código de sala de cuatro caracteres.
- Clasificación en directo.
- Diseño adaptable a celulares.
- Máximo de 40 jugadores por sala.

## Importante
Este proyecto usa salas guardadas en la memoria del servidor. Es ideal para partidas de clase o demostraciones, pero no guarda resultados después de reiniciar el servidor. En alojamientos gratuitos, el servicio puede tardar en despertar si lleva tiempo sin usarse; abre el enlace unos minutos antes de la partida. Mantén `server.js` y `package.json` en la raíz y `index.html` dentro de `public/`.
