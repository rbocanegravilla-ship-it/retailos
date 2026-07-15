"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type WarehouseStock = {
  code: string;
  name: string;
  quantity: number;
  sellable: boolean;
};

type Product = {
  sku: string;
  description: string;
  brand: string;
  line: string;
  principal: number;
  exhibition: number;
  unavailable: number;
  warehouses: WarehouseStock[];
};

type ImportMessage = {
  type: "success" | "error" | "idle";
  text: string;
};

const STORAGE_KEY = "retailos-products-v1";

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\s_-]/g, "")
    .trim();
}

function parseQuantity(value: string): number {
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/,/g, "");

  const quantity = Number(cleaned);

  return Number.isFinite(quantity) ? quantity : 0;
}

function parseSapFile(text: string): Product[] {
  const lines = text
    .replace(/\u0000/g, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const headerRowIndex = lines.findIndex(
    (line) =>
      line.includes("Artículo") &&
      line.includes("Alm.") &&
      line.includes("LibrUtiliz"),
  );

  if (headerRowIndex === -1) {
    throw new Error(
      "No se encontraron las columnas Artículo, Alm. y LibrUtiliz.",
    );
  }

  const headers = lines[headerRowIndex]
    .split("\t")
    .map((header) => normalizeHeader(header));

  const headerIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    if (header) {
      headerIndex.set(header, index);
    }
  });

  const requiredHeaders = [
    "alm",
    "articulo",
    "textobrevedearticulo",
    "textomarca",
    "linea",
    "librutiliz",
  ];

  const missingHeaders = requiredHeaders.filter(
    (header) => !headerIndex.has(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Faltan columnas necesarias: ${missingHeaders.join(", ")}`,
    );
  }

  const productsMap = new Map<string, Product>();

  for (const line of lines.slice(headerRowIndex + 1)) {
    const columns = line.split("\t");

    const getValue = (header: string): string => {
      const index = headerIndex.get(header);
      return index === undefined ? "" : (columns[index] ?? "").trim();
    };

    const sku = getValue("articulo");
    const warehouse = getValue("alm").padStart(4, "0");
    const quantity = parseQuantity(getValue("librutiliz"));

    if (!sku || !warehouse || quantity === 0) {
      continue;
    }

    const existingProduct = productsMap.get(sku);

    const product: Product =
  existingProduct ?? {
    sku,
    description: getValue("textobrevedearticulo"),
    brand: getValue("textomarca"),
    line: getValue("linea"),
    principal: 0,
    exhibition: 0,
    unavailable: 0,
    warehouses: [],
  };

const warehouseName =
  getValue("denomin") ||
  (warehouse === "0001"
    ? "PRINCIPAL"
    : warehouse === "0002"
      ? "EXHIBICIÓN"
      : "OTRO ALMACÉN");

const existingWarehouse = product.warehouses.find(
  (item) => item.code === warehouse,
);

if (existingWarehouse) {
  existingWarehouse.quantity += quantity;
} else {
  product.warehouses.push({
    code: warehouse,
    name: warehouseName,
    quantity,
    sellable: warehouse === "0001" || warehouse === "0002",
  });
}
    if (warehouse === "0001") {
      product.principal += quantity;
    } else if (warehouse === "0002") {
      product.exhibition += quantity;
    } else {
      product.unavailable += quantity;
    }

    productsMap.set(sku, product);
  }

  return Array.from(productsMap.values()).sort((a, b) =>
    a.description.localeCompare(b.description, "es"),
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] =
  useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [importMessage, setImportMessage] = useState<ImportMessage>({
    type: "idle",
    text: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEY);

      if (savedProducts) {
        setProducts(JSON.parse(savedProducts) as Product[]);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const indicators = useMemo(() => {
    const totals = products.reduce(
      (accumulator, product) => {
        accumulator.principal += product.principal;
        accumulator.exhibition += product.exhibition;
        accumulator.unavailable += product.unavailable;
        return accumulator;
      },
      {
        principal: 0,
        exhibition: 0,
        unavailable: 0,
      },
    );

    return {
      ...totals,
      available: totals.principal + totals.exhibition,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) =>
      [
        product.sku,
        product.description,
        product.brand,
        product.line,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [products, search]);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setImportMessage({
      type: "idle",
      text: "Leyendo y procesando el archivo SAP...",
    });

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const encoding =
        bytes[0] === 0xff && bytes[1] === 0xfe
          ? "utf-16le"
          : "utf-8";

      const decodedText = new TextDecoder(encoding).decode(buffer);
      const importedProducts = parseSapFile(decodedText);

      if (importedProducts.length === 0) {
        throw new Error(
          "El archivo fue leído, pero no contiene productos con stock.",
        );
      }

      setProducts(importedProducts);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(importedProducts),
      );

      setImportMessage({
        type: "success",
        text: `${importedProducts.length.toLocaleString(
          "es-PE",
        )} productos cargados correctamente.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible procesar el archivo.";

      setImportMessage({
        type: "error",
        text: message,
      });
    } finally {
      event.target.value = "";
    }
  }

  const cards = [
    {
      title: "Stock disponible",
      value: indicators.available,
      detail: "Principal + exhibición",
      accent: "bg-emerald-500",
    },
    {
      title: "Almacén principal",
      value: indicators.principal,
      detail: "Código SAP 0001",
      accent: "bg-blue-500",
    },
    {
      title: "Exhibición",
      value: indicators.exhibition,
      detail: "Código SAP 0002",
      accent: "bg-amber-500",
    },
    {
      title: "No disponible",
      value: indicators.unavailable,
      detail: "Reservas y otros almacenes",
      accent: "bg-red-500",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 px-5 py-6 text-white lg:flex">
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight">
              RetailOS
            </h1>
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
                type="button"
                onClick={() => {
                  if (item === "Importar SAP") {
                    fileInputRef.current?.click();
                  }
                }}
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
            <p className="text-sm font-medium">
              Ricardo Bocanegra
            </p>
            <p className="text-xs text-slate-400">
              Administrador
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  Panel principal
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tienda La Curacao · Estado operativo del inventario
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Importar stock SAP
              </button>
            </div>
          </header>

          <div className="space-y-8 p-6 lg:p-10">
            {importMessage.text && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  importMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : importMessage.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                <p className="font-medium">
                  {importMessage.text}
                </p>

                {fileName && (
                  <p className="mt-1 text-xs opacity-80">
                    Archivo: {fileName}
                  </p>
                )}
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`mb-5 h-1.5 w-12 rounded-full ${card.accent}`}
                  />

                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {card.value.toLocaleString("es-PE")}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.detail}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-bold">
                    Buscar producto
                  </h3>
                  <p className="text-sm text-slate-500">
                    Consulta por SKU, descripción, marca o línea.
                  </p>
                </div>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Escribe el producto que buscas..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:max-w-md"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-bold">
                    Productos
                  </h3>
                  <p className="text-sm text-slate-500">
                    Distribución de stock según almacén SAP.
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-500">
                  {filteredProducts.length.toLocaleString("es-PE")}{" "}
                  resultados
                </p>
              </div>

              {products.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h4 className="text-lg font-semibold">
                    Aún no se ha importado el stock
                  </h4>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Selecciona el archivo XLS exportado desde SAP
                    para cargar los productos y actualizar el
                    dashboard.
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Seleccionar archivo SAP
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">SKU / Artículo</th>
                        <th className="px-5 py-4">Producto</th>
                        <th className="px-5 py-4">Marca</th>
                        <th className="px-5 py-4">Línea</th>
                        <th className="px-5 py-4">Principal</th>
                        <th className="px-5 py-4">Exhibición</th>
                        <th className="px-5 py-4">No disponible</th>
                        <th className="px-5 py-4">Disponible</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.slice(0, 200).map((product) => (
                        <tr
  key={product.sku}
  onClick={() => setSelectedProduct(product)}
  className="cursor-pointer transition hover:bg-blue-50"
>
                          <td className="px-5 py-4 font-semibold text-blue-700">
                            {product.sku}
                          </td>

                          <td className="px-5 py-4">
                            {product.description}
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {product.brand || "Sin marca"}
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {product.line || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {product.principal}
                          </td>

                          <td className="px-5 py-4">
                            {product.exhibition}
                          </td>

                          <td className="px-5 py-4 text-red-600">
                            {product.unavailable}
                          </td>

                          <td className="px-5 py-4 font-semibold text-emerald-600">
                            {product.principal +
                              product.exhibition}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredProducts.length > 200 && (
                    <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
                      Se muestran los primeros 200 resultados.
                      Utiliza el buscador para encontrar un producto
                      específico.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
      {selectedProduct && (
  <div
    className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
    onClick={() => setSelectedProduct(null)}
  >
    <aside
      className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between border-b border-slate-200 p-6">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            {selectedProduct.sku}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {selectedProduct.description}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {selectedProduct.brand || "Sin marca"} ·{" "}
            {selectedProduct.line || "Sin línea"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar detalle"
        >
          ×
        </button>
      </div>

      <div className="space-y-6 p-6">
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-700">
              Principal
            </p>
            <p className="mt-2 text-2xl font-bold">
              {selectedProduct.principal}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">
              Exhibición
            </p>
            <p className="mt-2 text-2xl font-bold">
              {selectedProduct.exhibition}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">
              Disponible
            </p>
            <p className="mt-2 text-2xl font-bold">
              {selectedProduct.principal +
                selectedProduct.exhibition}
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold">
            Distribución por almacén
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Solo Principal y Exhibición están disponibles para venta.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Almacén</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {selectedProduct.warehouses
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((warehouse) => (
                    <tr key={warehouse.code}>
                      <td className="px-4 py-3 font-semibold">
                        {warehouse.code}
                      </td>

                      <td className="px-4 py-3">
                        {warehouse.name}
                      </td>

                      <td className="px-4 py-3 font-bold">
                        {warehouse.quantity}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            warehouse.sellable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {warehouse.sellable
                            ? "Disponible"
                            : "No vendible"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </aside>
  </div>
)}
    </main>
  );
}