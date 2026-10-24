export type Category = 'TOPS'|'BOTTOMS'|'OUTERWEAR'|'DRESSES'|'FOOTWEAR'|'ACCESSORIES';
export type GarmentStatus = 'AVAILABLE'|'WORN'|'LAUNDRY'|'DRYING'|'REPAIR';

export type Garment = {
  id: number;
  name: string;
  category: Category;
  brand: string;
  color: string;
  purchasePrice: number;
  purchasedOn: string | null;
  status: GarmentStatus;
  wearCount: number;
  notes: string;
  createdAt: string;
};

export type GarmentInput = Pick<Garment, 'name' | 'category' | 'brand' | 'color' | 'purchasePrice' | 'purchasedOn' | 'notes'>;
export type Summary = { totalItems: number; availableItems: number; laundryItems: number; wardrobeValue: number; totalWears: number; savedOutfits: number; currency: string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${url}`, options); }
  catch { throw new Error('Cannot reach the Java backend. Start Spring Boot on port 8080.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || error.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const json = (body: unknown) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const api = {
  garments: () => request<Garment[]>('/garments'),
  summary: () => request<Summary>('/summary'),
  create: (body: GarmentInput) => request<Garment>('/garments', { method: 'POST', ...json(body) }),
  update: (id: number, body: GarmentInput) => request<Garment>(`/garments/${id}`, { method: 'PUT', ...json(body) }),
  status: (id: number, status: GarmentStatus) => request<Garment>(`/garments/${id}/status`, { method: 'PATCH', ...json({status}) }),
  remove: (id: number) => request<void>(`/garments/${id}`, { method: 'DELETE' }),
  seed: () => request<{created: number}>('/demo/seed', { method: 'POST' })
};
