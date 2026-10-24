export type Category = 'TOPS'|'BOTTOMS'|'OUTERWEAR'|'DRESSES'|'FOOTWEAR'|'ACCESSORIES';
export type GarmentStatus = 'AVAILABLE'|'WORN'|'LAUNDRY'|'DRYING'|'REPAIR';
export type Season = 'ALL_SEASONS'|'SPRING'|'SUMMER'|'AUTUMN'|'WINTER';
export type Occasion = 'EVERYDAY'|'WORK'|'FORMAL'|'ACTIVE'|'OTHER';

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
  season: Season;
  occasion: Occasion;
  imageUrl: string | null;
  createdAt: string;
};

export type GarmentInput = Pick<Garment, 'name' | 'category' | 'brand' | 'color' | 'purchasePrice' | 'purchasedOn' | 'notes' | 'season' | 'occasion'>;
export type OutfitRecord = {
  id: number;
  name: string;
  occasion: Occasion;
  garmentIds: number[];
  garments: Garment[];
  available: boolean;
  warnings: string[];
  createdAt: string;
};
export type StatusEvent = {
  id:number;garmentId:number;garmentName:string;fromStatus:GarmentStatus;toStatus:GarmentStatus;
  origin:'MANUAL'|'LAUNDRY_WORKFLOW'|'WEAR_LOG';changedAt:string;
};
export type OutfitAlternative = {
  garmentId:number;garmentName:string;reason:string;alternatives:Garment[];
};
export type OutfitInput = {name:string;occasion:Occasion;garmentIds:number[]};
export type WearEvent = {
  id:number;wornOn:string;outfitId:number|null;outfitName:string|null;
  garmentIds:number[];notes:string;createdAt:string;
};
export type WearLogInput = {wornOn:string;outfitId?:number;garmentIds?:number[];notes:string};
export type WearAnalyticsData = {
  totalWearEvents:number;garmentWears:number;wornPieces:number;
  neverLoggedPieces:number;wardrobeValue:number;
  items:{garmentId:number;name:string;category:string;imageUrl:string|null;
    purchasePrice:number;wearCount:number;costPerWear:number|null;
    lastWorn:string|null;status:GarmentStatus;}[];
  daily:{date:string;events:number;garmentWears:number}[];
};
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
  uploadPhoto: (id: number, file: File) => {
    const body=new FormData(); body.append('file',file);
    return request<Garment>(`/garments/${id}/photo`, {method:'POST',body});
  },
  removePhoto: (id: number) => request<Garment>(`/garments/${id}/photo`, {method:'DELETE'}),
  outfits: () => request<OutfitRecord[]>('/outfits'),
  createOutfit: (body: OutfitInput) => request<OutfitRecord>('/outfits',{method:'POST',...json(body)}),
  updateOutfit: (id:number,body:OutfitInput) => request<OutfitRecord>('/outfits/'+id,{method:'PUT',...json(body)}),
  deleteOutfit: (id:number) => request<void>('/outfits/'+id,{method:'DELETE'}),
  laundryTransition: (id:number,to:GarmentStatus) =>
    request<Garment>(`/laundry/${id}/transition`,{method:'POST',...json({to})}),
  laundryHistory: () => request<StatusEvent[]>('/laundry/history'),
  outfitAlternatives: (id:number) => request<OutfitAlternative[]>(`/laundry/outfits/${id}/alternatives`),
  wearHistory: () => request<WearEvent[]>('/wears'),
  wearAnalytics: () => request<WearAnalyticsData>('/wears/analytics'),
  logWear: (body:WearLogInput) => request<WearEvent>('/wears',{method:'POST',...json(body)}),
  seed: () => request<{created: number}>('/demo/seed', { method: 'POST' })
};
