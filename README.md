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
