# RetailOS MVP Estable

Versión web estática para validación inicial con gerencias y pruebas de flujo operativo.

## Cómo probar localmente

Abre `index.html` en Chrome.

Usuario demo:

- admin / 123456
- supervisor / 123456
- almacen1 / 123456
- almacen2 / 123456
- vendedor1 / 123456

## Cómo subir a GitHub Pages

1. Sube todos estos archivos al repositorio `retailos`.
2. En GitHub entra a Settings → Pages.
3. En Source selecciona `Deploy from a branch`.
4. Branch: `main` y carpeta `/root`.
5. Guarda.
6. GitHub te dará un enlace público para probar la app.

## Alcance del MVP

- Login demo.
- Dashboard.
- Importación SAP por Excel o texto tabulado.
- Productos.
- Movimientos internos.
- Separaciones.
- Picking.
- Despachos.
- Inventario.
- Alertas.
- Reportes.

Los datos se guardan en el navegador mediante `localStorage`.
