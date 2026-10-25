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
export type Recommendation = {
  garmentIds:number[];garments:Garment[];score:number;reasons:string[];title:string;
};
export type RecommendationPack = {
  occasion:Occasion;season:Season;requireLayer:boolean;eligiblePieces:number;
  blockers:string[];suggestions:Recommendation[];
};
export type PlanSlot = 'MORNING'|'AFTERNOON'|'EVENING';
export type PlannedLook = {
  id:number;date:string;slot:PlanSlot;outfitId:number;outfitName:string;
  garments:Garment[];usableNow:boolean;warnings:string[];
};
export type PackingRequest = {occasions:Occasion[];season:Season;requireLayer:boolean};
export type PackingResult = {
  days:{day:number;occasion:Occasion;garmentIds:number[];garments:Garment[];matchScore:number}[];
  packedItems:Garment[];totalItems:number;blockers:string[];assumptions:string[];
};
export type AuditReport = {
  checkedAt:string;
  database:string;
  passed:boolean;
  totals:{
    garments:number;savedOutfits:number;calendarEntries:number;
    wearEvents:number;statusChanges:number;attachedPhotos:number;
  };
  issues:{severity:'ERROR'|'WARNING';code:string;message:string}[];
};
export type Summary = { totalItems: number; availableItems: number; laundryItems: number; wardrobeValue: number; totalWears: number; savedOutfits: number; currency: string };
export type BackendHealth = { status:string; app:string; phase:string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${url}`, options); }
  catch { throw new Error('Cannot reach the Java backend. Start Spring Boot on port 8080.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message=String(error.detail || error.message || error.error || `Request failed (${response.status})`);
    if(response.status===404 && url.startsWith('/laundry/') && /No static resource|No handler|No endpoint/i.test(message))
      throw new Error('This Java server does not have the Laundry API. Stop the outdated server on port 8080 and restart Spring Boot from your THREADWORK backend directory. No garment was updated.');
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const json = (body: unknown) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const api = {
  health: () => request<BackendHealth>('/health'),
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
  recommendations: (occasion:Occasion,season:Season,requireLayer:boolean) => {
    const params=new URLSearchParams({occasion,season,requireLayer:String(requireLayer),limit:'8'});
    return request<RecommendationPack>('/recommendations?'+params.toString());
  },
  calendar: (start:string,end:string)=>{
    const params=new URLSearchParams({start,end});
    return request<PlannedLook[]>('/planner/calendar?'+params.toString());
  },
  assignOutfit: (date:string,slot:PlanSlot,outfitId:number) =>
    request<PlannedLook>('/planner/calendar',{method:'PUT',...json({date,slot,outfitId})}),
  deleteAssignment: (id:number)=>request<void>('/planner/calendar/'+id,{method:'DELETE'}),
  packing: (body:PackingRequest)=>request<PackingResult>('/planner/packing',{method:'POST',...json(body)}),
  audit: () => request<AuditReport>('/system/audit'),
  seed: () => request<{created: number}>('/demo/seed', { method: 'POST' })
};
