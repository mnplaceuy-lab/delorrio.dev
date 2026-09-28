# Delorrio.dev

Sitio estático (HTML/CSS/JS puro). Estructura:

```
index.html
css/style.css
js/main.js
img/santiago.png
```

## Subir a GitHub

```bash
cd delorrio-dev
git init
git add .
git commit -m "Sitio inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/delorrio-dev.git
git push -u origin main
```

## Deploy en Railway

1. Railway → New Project → Deploy from GitHub repo → elegir `delorrio-dev`.
2. Railway detecta `package.json` y corre `npm install` + `npm start` (sirve el sitio con `serve`).
3. En Settings → Networking → generar dominio, o conectar tu dominio propio (Custom Domain) y apuntar el DNS (CNAME) como indique Railway.

## Agregar imágenes nuevas

Poner los archivos en `img/` y referenciarlos en `index.html` como `img/nombre.png`.

## Escena 3D "De la idea al producto"

La escena está hecha con React + Three.js + React Three Fiber (código fuente en `scene/`).
Se compila a un único archivo, `js/scene.bundle.js`, que el sitio carga solo cuando la sección
está por aparecer. Railway no necesita compilar nada: el bundle ya va incluido en el repo.

Para modificar la escena:

```bash
cd scene
npm install
npm run build   # regenera ../js/scene.bundle.js
```

Componentes: `DigitalIdeaScene`, `IdeaCore`, `IdeaFragments`, `ConnectionLines`, `ProductPanels`,
`Particles`, `CameraRig`, `SceneLights`, `PostEffects` (en `scene/src/components/`).
Layout, paleta y niveles de detalle por dispositivo: `scene/src/constants.js`.
