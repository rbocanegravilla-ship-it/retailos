const indicators = [
  {
    title: "Stock disponible",
    value: "1,460",
    detail: "Principal + exhibición",
    accent: "bg-emerald-500",
  },
  {
    title: "Almacén principal",
    value: "1,097",
    detail: "Código SAP 0001",
    accent: "bg-blue-500",
  },
  {
    title: "Exhibición",
    value: "363",
    detail: "Código SAP 0002",
    accent: "bg-amber-500",
  },
  {
    title: "No disponible",
    value: "230",
    detail: "Reservas y otros almacenes",
    accent: "bg-red-500",
  },
];

const products = [
  {
    sku: "1002458",
    product: "Televisor Smart TV 55 pulgadas",
    brand: "Samsung",
    principal: 3,
    exhibition: 1,
    unavailable: 0,
  },
  {
    sku: "1003792",
    product: "Refrigeradora No Frost 309 litros",
    brand: "Bord",
    principal: 2,
    exhibition: 1,
    unavailable: 1,
  },
  {
    sku: "1005814",
    product: "Cocina a gas de 5 hornillas",
    brand: "Mabe",
    principal: 4,
    exhibition: 1,
    unavailable: 2,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 px-5 py-6 text-white lg:flex">
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight">RetailOS</h1>
            <p className="mt-1 text-sm text-slate-400">
              Gestión operativa retail
            </p>
          </div>

          <nav className="space-y-2 text-sm">
            {[
              "Dashboard",
              "Productos",
              "Importar SAP",
              "Movimientos",
              "Separaciones",
              "Picking",
              "Despachos",
              "Inventario",
              "Alertas",
              "Reportes",
            ].map((item, index) => (
              <button
                key={item}
                className={`w-full rounded-lg px-4 py-3 text-left transition ${
                  index === 0
                    ? "bg-blue-600 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-800 pt-5">
            <p className="text-sm font-medium">Ricardo Bocanegra</p>
            <p className="text-xs text-slate-400">Administrador</p>
          </div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold">Panel principal</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tienda La Curacao · Estado operativo del inventario
                </p>
              </div>

              <button className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Importar stock SAP
              </button>
            </div>
          </header>

          <div className="space-y-8 p-6 lg:p-10">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {indicators.map((indicator) => (
                <article
                  key={indicator.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`mb-5 h-1.5 w-12 rounded-full ${indicator.accent}`}
                  />
                  <p className="text-sm font-medium text-slate-500">
                    {indicator.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold">{indicator.value}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {indicator.detail}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-bold">Buscar producto</h3>
                  <p className="text-sm text-slate-500">
                    Consulta por SKU, descripción, marca o modelo.
                  </p>
                </div>

                <input
                  type="search"
                  placeholder="Escribe el producto que buscas..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:max-w-md"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">Productos recientes</h3>
                <p className="text-sm text-slate-500">
                  Distribución de stock según almacén SAP.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">SKU</th>
                      <th className="px-5 py-4">Producto</th>
                      <th className="px-5 py-4">Marca</th>
                      <th className="px-5 py-4">Principal</th>
                      <th className="px-5 py-4">Exhibición</th>
                      <th className="px-5 py-4">No disponible</th>
                      <th className="px-5 py-4">Disponible</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product.sku} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium">{product.sku}</td>
                        <td className="px-5 py-4">{product.product}</td>
                        <td className="px-5 py-4 text-slate-500">
                          {product.brand}
                        </td>
                        <td className="px-5 py-4">{product.principal}</td>
                        <td className="px-5 py-4">{product.exhibition}</td>
                        <td className="px-5 py-4 text-red-600">
                          {product.unavailable}
                        </td>
                        <td className="px-5 py-4 font-semibold text-emerald-600">
                          {product.principal + product.exhibition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}