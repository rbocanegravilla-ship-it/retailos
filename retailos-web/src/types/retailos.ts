export type WarehouseStock = {
  code: string;
  name: string;
  quantity: number;
  sellable: boolean;
};

export type Product = {
  sku: string;
  description: string;
  brand: string;
  line: string;
  principal: number;
  exhibition: number;
  unavailable: number;
  warehouses: WarehouseStock[];
};

export type Movement = {
  id: string;
  sku: string;
  product: string;
  origin: string;
  destination: string;
  quantity: number;
  reason: string;
  user: string;
  createdAt: string;
};

export type ImportMessage = {
  type: "success" | "error" | "idle";
  text: string;
};

export type UserRole =
  | "ADMINISTRADOR"
  | "SUPERVISOR"
  | "ALMACEN"
  | "VENDEDOR";

export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
};