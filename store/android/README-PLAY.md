# PULSO → Google Play — guía completa

Estado del paquete (2026-07-10): **TODO listo para subir**. Falta solo la cuenta
de Google Play Developer (USD 25, una vez) y el closed testing obligatorio.

## Qué hay acá

| Archivo | Qué es |
|---|---|
| `twa-manifest.json` | Config de la TWA (Bubblewrap). La app envuelve `https://pulso-exchange.vercel.app` — cada deploy a Vercel actualiza la app SIN re-publicar en Play. |
| `pulso-1.0.0.aab` | El bundle FIRMADO que se sube a Play Console (gitignoreado; regenerable, ver abajo). |
| `pulso-1.0.0.apk` | APK firmado para instalar directo en un teléfono y probar YA (gitignoreado). |
| `listing/ficha-play.md` | Título, descripciones y datos de la ficha, listos para pegar. |
| `listing/feature-graphic.png` | Banner 1024×500 (obligatorio). |
| `listing/screenshots/` | 5 capturas de teléfono 1080×2340 (mínimo exigido: 2). |

Piezas que viven en otro lado:

- **Keystore de upload**: `C:\Users\Cript\.keys\pulso-android\upload.keystore`
  (credenciales en `CREDENCIALES.txt` de esa carpeta — NUNCA subir a un repo).
- **Digital Asset Links**: `apps/web/public/.well-known/assetlinks.json` (servido
  por Vercel). Es lo que hace que la app abra full-screen sin barra de navegador.
- **Política de privacidad**: `https://pulso-exchange.vercel.app/privacidad.html`
  (Play la exige en la ficha).

## Probar la app en un teléfono HOY (sin cuenta de Play)

1. Pasá `pulso-1.0.0.apk` al teléfono (Drive, cable, lo que sea).
2. Abrilo → Android va a pedir permiso para "instalar apps desconocidas" → aceptar.
3. La app abre full-screen con splash violeta. Si aparece barra de navegador,
   el assetlinks.json todavía no está deployado o el dominio no coincide.

## Publicar en Play — pasos de Guille

1. **Cuenta**: [play.google.com/console/signup](https://play.google.com/console/signup) — USD 25 única vez, cuenta personal.
2. **Crear app**: "PULSO", idioma español (Latinoamérica), tipo App, gratis.
3. **Ficha**: pegar textos de `listing/ficha-play.md`, subir feature graphic y screenshots.
4. **Política de privacidad**: pegar la URL de arriba.
5. **Content rating / Data safety**: cuestionarios — declarar que NO se recolectan
   datos (es la verdad, ver privacidad.html). En categoría financiera aclarar que
   es tracker/educativa, sin trading real.
6. **Subir el `.aab`**: Testing → Closed testing → crear track → subir `pulso-1.0.0.aab`.
7. **⚠️ Requisito de cuentas personales nuevas**: ~12 testers durante 14 días
   ANTES de poder pasar a producción. Invitarlos por email desde el track.
8. **Play App Signing**: al subir el primer .aab, Google genera SU llave de firma.
   Ir a **Setup → App integrity → App signing** y copiar el
   **SHA-256 del App signing key certificate** → agregarlo como SEGUNDA entrada en
   `apps/web/public/.well-known/assetlinks.json` (pedírmelo: "agregá el fingerprint
   de Play al assetlinks"). Sin esto, la versión de Play muestra barra de navegador.
9. Cumplidos los 14 días → **Promote release → Production**.

## Regenerar el .aab/.apk (nueva versión)

```bash
# 1) Subir versionCode/versionName en twa-manifest.json (appVersionCode +1)
# 2) Regenerar el proyecto y buildear:
cd store/android
npx @bubblewrap/cli update --skipVersionUpgrade
JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot" ANDROID_HOME="C:\Users\Cript\android-sdk" cmd //c ".\gradlew.bat bundleRelease assembleRelease"
# 3) Firmar (pedirme "regenerá y firmá el aab de PULSO" y lo hago entero)
```

Gotchas del build en esta máquina (ya resueltos, documentados por si migra):
- Bubblewrap valida que `androidSdkPath` contenga `bin/` o `tools/` en la raíz →
  apuntar a `C:/Users/Cript/android-sdk/cmdline-tools/latest` en `~/.bubblewrap/config.json`.
- `bubblewrap build` falla en esta shell ("gradlew.bat no se reconoce") → correr
  gradle directo con `cmd //c ".\gradlew.bat ..."` (ruta explícita) y firmar a mano
  (jarsigner para el .aab, zipalign+apksigner para el .apk).
- `apksigner` necesita `JAVA_HOME` exportado.

## iOS (fase 2, cuando Play esté publicado)

- Cuenta Apple Developer: USD 99/año + build con Xcode (requiere Mac o CI tipo
  Codemagic). Riesgo de rechazo por guideline 4.2 (apps "solo web") — mitigar
  posicionando como educativa/tracker. Evaluar recién con Play andando.
