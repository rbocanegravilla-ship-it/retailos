import type { Product } from "@/types/retailos";

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\s_-]/g, "")
    .trim();
}

function parseQuantity(value: string): number {
  const cleaned = value.trim().replace(/\s/g, "").replace(/,/g, "");
  const quantity = Number(cleaned);

  return Number.isFinite(quantity) ? quantity : 0;
}

export function parseSapFile(text: string): Product[] {
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