import { QuoteItem } from "./types";

export const TEMPLATES: Array<Pick<QuoteItem, "category" | "description" | "specification" | "unitType" | "price" | "unitValue" | "quantity"> & { label: string }> =
  [
    { label: "Wardrobe (laminate)", category: "Wardrobe", description: "Sliding wardrobe", specification: "BWR ply + laminate", unitType: "sqft", price: 1450, unitValue: 60, quantity: 1 },
    { label: "Kitchen (modular)", category: "Kitchen", description: "Modular kitchen cabinets", specification: "BWR ply + laminate + hardware", unitType: "rft", price: 2200, unitValue: 12, quantity: 1 },
    { label: "TV Unit", category: "TV Unit", description: "TV panel + base", specification: "BWR ply + laminate", unitType: "rft", price: 1200, unitValue: 8, quantity: 1 },
    { label: "Vanity", category: "Vanity", description: "Vanity cabinet", specification: "PVC board / BWR ply", unitType: "nos", price: 8500, unitValue: 1, quantity: 1 },
    { label: "Double Bed", category: "Furniture", description: "King size bed with storage", specification: "Engineered wood + fabric headboard", unitType: "nos", price: 45000, unitValue: 1, quantity: 1 },
    { label: "Dining Table (6 seater)", category: "Furniture", description: "Dining table set", specification: "Solid wood + glass top", unitType: "set", price: 35000, unitValue: 1, quantity: 1 },
    { label: "Sofa (3+2)", category: "Furniture", description: "Fabric sofa set", specification: "Solid wood frame + premium fabric", unitType: "set", price: 55000, unitValue: 1, quantity: 1 },
    { label: "Shoe Rack", category: "Furniture", description: "Compact shoe cabinet", specification: "Laminate finish", unitType: "nos", price: 6500, unitValue: 1, quantity: 1 },
    { label: "Dressing Table", category: "Furniture", description: "Full length mirror with storage", specification: "MDF + laminate finish", unitType: "nos", price: 12500, unitValue: 1, quantity: 1 },
    { label: "Study Table", category: "Furniture", description: "Work desk with drawers", specification: "Ply + laminate", unitType: "nos", price: 9500, unitValue: 1, quantity: 1 },
  ];
