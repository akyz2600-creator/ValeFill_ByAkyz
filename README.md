# ValeFill By Akyz

Aplicación Android para rellenar automáticamente el **vale azul de COMPROBANTE DE GASTOS** sobre la imagen original del formato. Todo ocurre en el dispositivo: sin servidores, sin cuentas, sin publicidad y con funcionamiento sin conexión.

> **Estado y limitaciones reales:** consulta [`PROJECT_STATUS.md`](PROJECT_STATUS.md). Importante: falta agregar la plantilla `public/vale-azul.jpg` y calibrar las posiciones sobre ella (ver más abajo).

## Qué hace

- Formulario rápido: importe ($) e importe en letra, concepto, filas dinámicas de «Cárguese a» (cuenta, nombre, importe; sin límite artificial), fecha (hoy por defecto, editable), autorizado por y recibido por.
- Importe en letra automático en **español y pesos mexicanos** (`MIL DOSCIENTOS TREINTA Y CUATRO PESOS 56/100 M.N.`), editable a mano si se desea.
- Vista previa en tiempo real sobre la plantilla, con zoom (botones, deslizador y pellizco).
- Ajuste automático del tamaño de letra y salto de línea; **avisa** cuando un texto o las filas no caben.
- Validación de campos y cantidades (importe válido, suma de filas vs. importe, fecha, etc.).
- Borrador guardado automáticamente y recuperado al reabrir la app.
- Historial en IndexedDB: guardar, editar, duplicar y eliminar. «Nuevo» guarda antes el comprobante en curso, así no se pierde nada.
- Exportar a **PNG, JPEG y PDF**; descargar o **compartir** con el menú nativo de Android.
- Modo **Calibrar** para colocar cada campo sobre la plantilla real.

## Stack

React + TypeScript + Vite · Capacitor 6 (Android) · HTML Canvas · IndexedDB · jsPDF · GitHub Actions.

## 1. Agregar la plantilla (obligatorio)

Copia la imagen original del vale a:

```
public/vale-azul.jpg
```

No se modifica ni se rediseña: la app dibuja los textos encima, conservando proporciones y calidad. Si el archivo no existe, la app muestra un aviso y el workflow de GitHub Actions falla con un mensaje claro (para no generar un APK sin plantilla).

## 2. Calibrar las posiciones

Las posiciones por defecto (`src/lib/layout.ts`) son **provisionales** porque se definieron sin ver la imagen real. Abre la pestaña **Calibrar**:

1. Elige un campo (o el área / columnas de «Cárguese a»).
2. Toca la vista previa para mover su esquina superior izquierda y afina con los controles (posición, tamaño, líneas, alineación).
3. Los ajustes se guardan en el dispositivo. Todas las coordenadas son **relativas a la imagen** (0–1), independientes de la resolución de pantalla.

Para dejarlos fijos en el código: **Copiar ajustes (JSON)** y pega el resultado en `DEFAULT_LAYOUT` (`src/lib/layout.ts`). Si la plantilla ya trae impreso el símbolo `$`, desactiva «Dibujar el símbolo $».

## 3. Obtener el APK (GitHub Actions)

El workflow [`.github/workflows/android.yml`](.github/workflows/android.yml) se ejecuta en cada push a `main`/`master`, en pull requests y manualmente (*Actions → Build Android APK → Run workflow*). Pasos: instala dependencias → pruebas → typecheck → compila React → genera/sincroniza el proyecto Android con Capacitor → `assembleDebug` → publica el artefacto.

1. Entra a la pestaña **Actions** del repositorio y abre la última ejecución.
2. En **Artifacts** descarga `ValeFill-debug-apk` (contiene `app-debug.apk`).
3. Copia el APK al teléfono y ábrelo (permite «instalar apps de origen desconocido» si Android lo pide).

Ruta del APK dentro del runner: `android/app/build/outputs/apk/debug/app-debug.apk`. Es un APK **debug** (firmado con la clave de depuración), instalable directamente.

El proyecto nativo `android/` lo genera Capacitor (`npx cap add android`) cuando no existe; si lo generas y confirmas en el repositorio (`npm run android:add`), el workflow lo reutiliza.

## Desarrollo local

Requiere Node 22+ (las pruebas usan el *type stripping* nativo de Node).

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # pruebas: dinero, validación y ajuste de texto
npm run typecheck    # TypeScript
npm run build        # compila a dist/
```

Compilar el APK localmente (requiere JDK 17 y Android SDK):

```bash
npm run android:add      # solo la primera vez
npm run icons            # opcional: íconos desde assets/
npm run android:debug    # build + cap sync + gradlew assembleDebug
```

## Estructura

```
public/vale-azul.jpg      Plantilla original (la debes agregar)
assets/                   Íconos fuente (capacitor-assets)
src/lib/money.ts          Parseo, formato y conversión a letras (MXN)
src/lib/layout.ts         Posiciones relativas por defecto + mezcla de ajustes
src/lib/render.ts         Dibujo en canvas, ajuste de texto, avisos
src/lib/validate.ts       Validaciones
src/lib/db.ts             IndexedDB (historial, borrador, calibración)
src/lib/exporter.ts       PNG / JPEG / PDF, descargar y compartir
src/components/           Formulario, vista previa, historial, calibración
tests/                    Pruebas con node:test
.github/workflows/        Compilación del APK
```
