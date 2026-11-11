# Cotizador Iron Mallas — reglas comerciales y PDF (5 de noviembre de 2026)

Ruta única: **Comercial → Generar cotización** (`/admin/cotizaciones/nueva`). El historial y las versiones se consultan en la ficha de cada cotización.

## 1. Reglas de cálculo implementadas

Todas las tarifas son **valores netos en CLP**. La aritmética es entera (BigInt en el navegador, `numeric` en PostgreSQL) con redondeo mitad hacia arriba, y el servidor recalcula todo al guardar (`private.save_quick_quote`).

| Tarifa | Unidad | Precio neto | Fórmula por zona |
|---|---|---|---|
| Instalación solo ángulos | metro lineal (`ml`) | $6.000 | `(ancho + alto) × cantidad × 6.000` |
| Recambio | metro lineal (`ml`) | $5.000 | `(ancho + alto) × cantidad × 5.000` |
| Pilar adicional 2,00 m | unidad | $17.990 | `cantidad × 17.990` (solo unidades enteras) |
| Pilar adicional 2,40 m | unidad | $19.990 | `cantidad × 19.990` (solo unidades enteras) |

- **Metro lineal = ancho + alto.** No se usa ancho × alto ni se convierte al perímetro completo (2 × (ancho + alto)).
- Varias zonas: se suman los metros lineales de todas las zonas.
- Los pilares se agregan como conceptos adicionales y se suman al trabajo principal.
- Las tarifas por m² existentes (ancho × alto) siguen disponibles sin cambios en su fórmula.
- **Descuento:** las tarifas base se cargan con descuento máximo 0 %; solo SUPERADMIN puede aplicar uno. Se calcula sobre el subtotal neto.
- **IVA:** tasa configurada (19 %) sobre el neto. Solo SUPERADMIN puede omitirlo (por ejemplo, una operación exenta confirmada por el contador). El PDF muestra «TOTAL (IVA incluido)».
- Valor neto manual y adicionales manuales: solo SUPERADMIN, con procedencia obligatoria.

### Ejemplo 3,50 × 1,70 m (instalación solo ángulos)

| Concepto | Valor |
|---|---|
| Metros lineales | 3,50 + 1,70 = **5,20 m** |
| Neto | 5,20 × $6.000 = **$31.200** |
| IVA 19 % | **$5.928** |
| **Total IVA incluido** | **$37.128** |

El mismo trabajo como recambio: 5,20 × $5.000 = $26.000 neto · IVA $4.940 · total $30.940.
Con 2 pilares de 2,00 m y 1 de 2,40 m: $31.200 + $35.980 + $19.990 = $87.170 neto · IVA $16.562 · total $103.732.

## 2. Cotización referencial y definitiva

- Por defecto cada versión es **«COTIZACIÓN REFERENCIAL — SUJETA A EVALUACIÓN TÉCNICA»** e incluye bajo el total la nota de valor aproximado.
- Tras la evaluación técnica se marca «Cotización definitiva» y se guarda **una nueva versión**; la referencial anterior se conserva en el historial.
- Las cotizaciones **aceptadas, rechazadas o vencidas no admiten nuevas versiones** (sin cambios unilaterales de precio o alcance).
- Guardar, descargar el PDF o abrir WhatsApp **no** marca la cotización como enviada.

## 3. PDF (A4)

`src/features/quotes/pdf-quick.ts` · textos fijos en `src/features/quotes/terms.ts` · logotipo oficial `public/brand/logo-color.png`.

1. Encabezado con logotipo, número, versión, fecha de emisión y vigencia.
2. Título referencial o definitivo.
3. Cliente y dirección del trabajo.
4. Descripción del servicio y método de cálculo.
5. Tabla de zonas (ancho, alto, cantidad, ancho + alto o superficie).
6. Conceptos y adicionales (valor neto con detalle: «5,20 m lineales × $6.000 neto», «2 × $17.990 neto»).
7. Resumen: subtotal neto, descuento autorizado, IVA, total IVA incluido y nota referencial.
8. Vigencia y condiciones comerciales **configuradas** (pago, garantía y observaciones solo si existen).
9. Términos y condiciones (8 apartados).
10. Bloque de contacto y pie en cada página con identificación legal: *Iron Mallas es una marca de Solinteg Security Asociados SpA · RUT 78.467.119-4*.

Saltos de página: las filas de la tabla repiten encabezado, los párrafos cortos no se parten y el pie numera «Página X de Y».
Vista previa: `docs/cotizador/vista-previa-p1.png`, `vista-previa-p2.png` (generada con `npx tsx scripts/sample-quote-pdf.ts`).

## 4. Pruebas automatizadas

`tests/quote-pricing.test.ts` y `tests/commercial.test.ts`: fórmula ancho + alto, tarifas de $6.000 y $5.000, pilares y unidades enteras, IVA y redondeo, descuentos, varias zonas, igualdad TS = SQL con las tarifas sembradas, versión referencial → definitiva, conservación de aceptadas, PDF con términos completos, identificación legal y paginación.

## 5. Activación (requiere autorización)

1. Aplicar la migración `supabase/migrations/20261105150000_quote_linear_pricing.sql` (aditiva): agrega la unidad «metro lineal», crea las 4 tarifas si no existen con ese nombre y actualiza `save_quick_quote`.
2. En **Mi cuenta → Tarifario → Condiciones comerciales** (vienen precargados razón social, RUT, domicilio, contacto e IVA 19 %): definir **vigencia en días** y **condiciones de pago**, y la **garantía** solo si está aprobada por escrito.

## 6. Pendiente de aprobación de Iron Mallas

- Vigencia de las cotizaciones, condiciones de pago, anticipos y plazos de ejecución (no se establecen automáticamente).
- Garantía: períodos y exclusiones (no se inventan).
- Descuento máximo que puede aplicar un ADMIN en cada tarifa.
- Mínimos por trabajo, recargos (altura, comuna) y otros adicionales, si existen.
- Confirmar con el contador el tratamiento tributario de cada tipo de operación y documento (boleta o factura). El PDF es un presupuesto y no sustituye ninguno de ellos.
