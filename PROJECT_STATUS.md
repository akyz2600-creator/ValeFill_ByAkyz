# PROJECT_STATUS — ValeFill By Akyz

Última actualización: 2026-11-25

## Resumen honesto

El código de la aplicación, el modo de calibración, el workflow de CI y la documentación están escritos y confirmados en el repositorio. **Todavía no existe un APK**: el repositorio estaba vacío, la plantilla `public/vale-azul.jpg` no estaba disponible y el entorno de desarrollo no permitía instalar paquetes (`npm install` bloqueado), por lo que **no se pudo compilar con Vite ni con Gradle**. El APK se generará la primera vez que corra el workflow con la plantilla presente.

## Pendiente (acción requerida)

1. **Agregar `public/vale-azul.jpg`** (imagen original del vale). Sin ella el workflow falla a propósito.
2. **Calibrar las posiciones** de los campos en la pestaña *Calibrar* (las de `src/lib/layout.ts` son provisionales: se definieron sin ver la imagen) y, si se quiere, fijarlas en `DEFAULT_LAYOUT`.
3. Ejecutar el workflow *Build Android APK* y descargar `ValeFill-debug-apk` desde Artifacts.
4. Revisar el resultado de la primera compilación: puede requerir ajustes que aquí no se pudieron detectar.

## Funcionalidades implementadas

| Funcionalidad | Estado |
|---|---|
| Formulario (importe, letra, concepto, filas dinámicas, fecha, autorizado, recibido) | Implementado |
| Filas «Cárguese a» agregar/eliminar sin límite; reparto en el espacio, tamaño de letra automático y aviso si no caben | Implementado; lógica probada con canvas simulado |
| Importe a letra en español / pesos mexicanos | Implementado y probado (límite: 999,999,999,999.99) |
| Validación de campos y cantidades (incluye suma de filas vs. importe) | Implementado y probado |
| Vista previa en tiempo real con zoom (botones, deslizador, pellizco) | Implementado; no probado en dispositivo |
| Coordenadas relativas a la imagen + modo Calibrar (tocar/ajustar, copiar/pegar JSON, restablecer) | Implementado; no probado con la plantilla real |
| Borrador automático y recuperación al reabrir (IndexedDB; guarda también al pasar a segundo plano) | Implementado; no probado en dispositivo |
| Historial: guardar, editar, duplicar, eliminar; «Nuevo» conserva el comprobante anterior | Implementado; no probado en dispositivo |
| Exportar PNG / JPEG / PDF | Implementado; no probado en ejecución |
| Compartir desde Android (Capacitor Share) y descargar | Implementado; no probado en dispositivo |
| Funcionamiento sin conexión (assets empaquetados en el APK, sin fuentes ni CDNs externos) | Por diseño; no probado en dispositivo |
| Identidad visual (azul oscuro / azul eléctrico / blanco), ícono de la app, sin publicidad | Implementado |
| Workflow de GitHub Actions que compila y publica el APK debug | Escrito; **nunca ejecutado** |

## Qué se verificó y qué no

Verificado en el entorno de desarrollo:

- 17 pruebas automáticas (`npm test`) en verde: parseo/formato de importes, conversión a letra (incluye barrido de 0 a 20,000), validaciones, ajuste de texto, filas dinámicas, avisos, recorte, reducción de imágenes grandes, mezcla de ajustes.
- `tsc --noEmit` sin errores **contra declaraciones mínimas simuladas** de React, Capacitor y jsPDF (no contra los tipos reales).
- Bundle con esbuild de toda la app (sintaxis, JSX e imports correctos).

NO verificado:

- `npm install`, `vite build` y la verificación de tipos con las dependencias reales.
- Todo el pipeline Android (Capacitor, Gradle, APK, instalación).
- Comportamiento en un teléfono: render real en canvas, IndexedDB, compartir, guardar en Documentos, pellizco.
- Apariencia del texto sobre la plantilla real.

## Limitaciones y decisiones conocidas

- **Proyecto `android/` generado en CI** (`npx cap add android`) en lugar de escribirse a mano: sin acceso a npm no se podía generar con garantías. Se puede generar y confirmar localmente con `npm run android:add`.
- **Sin `package-lock.json`** (no se pudo generar sin red); el workflow usa `npm install`. Conviene confirmar el lockfile tras la primera ejecución.
- **Typecheck no bloquea el APK** en CI (`continue-on-error`) porque no se pudo validar con los tipos reales; el fallo quedaría visible como anotación. Quitar el flag cuando esté en verde.
- **Solo APK debug** (sin firma de release ni publicación en Play Store).
- **Capacitor 6 / Java 17** fijados deliberadamente por ser la combinación conocida; no se migró a versiones posteriores.
- **Descargar en Android** intenta escribir en `Documentos/ValeFill/`; si el sistema lo impide, abre el menú de compartir (desde donde se puede guardar). Comportamiento por versión de Android sin confirmar.
- **Fecha**: se dibuja como un solo texto `dd/mm/aaaa`. Si el vale tiene casillas separadas de día/mes/año, habría que dividir el campo.
- **PDF**: una página A4 con la imagen ajustada y centrada (orientación según proporción de la plantilla).
- El tamaño máximo del canvas de exportación es de 3200 px por lado (la imagen se reduce proporcionalmente si es mayor); la vista previa usa 2400 px.
- Los íconos se generan con `@capacitor/assets` en CI; si ese paso falla, el APK usa el ícono por defecto.
