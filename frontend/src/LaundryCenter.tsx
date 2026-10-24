import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3,
  History, RefreshCw, Shirt, Sparkles, WashingMachine, Wrench, X } from 'lucide-react';
import { api } from './api';
import type { Garment, GarmentStatus, OutfitAlternative, OutfitRecord, StatusEvent } from './api';
import './laundry.css';

type Step = {label:string;to:GarmentStatus;primary?:boolean};
const actions:Record<GarmentStatus,Step[]>={
  AVAILABLE:[{label:'Mark worn',to:'WORN',primary:true},{label:'Wash now',to:'LAUNDRY'}],
  WORN:[{label:'Send to laundry',to:'LAUNDRY',primary:true},{label:'Still ready to wear',to:'AVAILABLE'}],
  LAUNDRY:[{label:'Start drying',to:'DRYING',primary:true},{label:'Mark clean',to:'AVAILABLE'}],
  DRYING:[{label:'Finish drying',to:'AVAILABLE',primary:true},{label:'Wash again',to:'LAUNDRY'}],
  REPAIR:[{label:'Repair complete',to:'AVAILABLE',primary:true},{label:'Send to laundry',to:'LAUNDRY'}]
};
const lanes: {status:GarmentStatus;label:string;desc:string}[]=[
  {status:'WORN',label:'Worn',desc:'Ready for a wash or another wear'},
  {status:'LAUNDRY',label:'In the wash',desc:'Currently being washed'},
  {status:'DRYING',label:'Drying',desc:'Almost back in rotation'},
  {status:'REPAIR',label:'Needs attention',desc:'Set aside for repairs'},
  {status:'AVAILABLE',label:'Ready to wear',desc:'Clean and available for outfits'}
];
const pretty=(s:string)=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function thumb(item:Garment){
  return item.imageUrl?<img className="lc-photo" src={item.imageUrl} alt={item.name} loading="lazy"/>:
    <div className="lc-placeholder" style={{backgroundColor:item.color+'25'}}><Shirt size={24} color={item.color}/></div>;
}
export function LaundryCenter({items,onChanged,onGoOutfits}:{
  items:Garment[];onChanged:()=>Promise<void>;onGoOutfits:()=>void
}){
  const [history,setHistory]=useState<StatusEvent[]>([]);
  const [outfits,setOutfits]=useState<OutfitRecord[]>([]);
  const [suggestions,setSuggestions]=useState<Record<number,OutfitAlternative[]>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showReady,setShowReady]=useState(false);
  const [loadingAlternatives,setLoadingAlternatives]=useState<number|null>(null);
  const [refreshing,setRefreshing]=useState(false);
  const refresh=useCallback(async()=>{
    try{
      const [events,looks]=await Promise.all([api.laundryHistory(),api.outfits()]);
      setHistory(events);setOutfits(looks);setError('');
    }catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{void refresh()},[refresh]);
  const problemOutfits=outfits.filter(o=>!o.available);
  const byStatus=useMemo<Record<GarmentStatus,Garment[]>>(()=>({
    AVAILABLE:items.filter(g=>g.status==='AVAILABLE'),
    WORN:items.filter(g=>g.status==='WORN'),
    LAUNDRY:items.filter(g=>g.status==='LAUNDRY'),
    DRYING:items.filter(g=>g.status==='DRYING'),
    REPAIR:items.filter(g=>g.status==='REPAIR')
  }),[items]);
  const laundryCount=(byStatus.LAUNDRY?.length||0)+(byStatus.DRYING?.length||0);
  const inRotation=byStatus.AVAILABLE.length;
  async function transition(item:Garment,to:GarmentStatus){
    try{
      setBusy(true);setError('');
      await api.laundryTransition(item.id,to);
      await onChanged();await refresh();setSuggestions({});
      setNotice(item.name+' moved to '+pretty(to)+'.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function loadAlternatives(id:number){
    try{
      setLoadingAlternatives(id);setError('');
      const result=await api.outfitAlternatives(id);
      setSuggestions(prev=>({...prev,[id]:result}));
    }catch(e){setError((e as Error).message);}
    finally{setLoadingAlternatives(null);}
  }
  async function applyAlternative(outfit:OutfitRecord,oldId:number,newId:number){
    const garmentIds=outfit.garmentIds.map(id=>id===oldId?newId:id);
    if(new Set(garmentIds).size!==garmentIds.length){
      setError('This replacement is already in the outfit. Choose a different garment.');return;
    }
    try{
      setBusy(true);setError('');
      await api.updateOutfit(outfit.id,{name:outfit.name,occasion:outfit.occasion,garmentIds});
      await refresh();await onChanged();setSuggestions({});
      setNotice('Updated "'+outfit.name+'" with an available replacement.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function updateNow(){
    setRefreshing(true);
    try{await onChanged();await refresh();setNotice('Your clothing and outfit status are up to date.');}
    finally{setRefreshing(false);}
  }
  return <section className="lc-root">
    <div className="page-heading"><div>
      <div className="overline"><span className="gold-line"/> THE CARE CYCLE · PHASE 4</div>
      <h1>Laundry center<span>.</span></h1>
      <p>Keep every garment in rotation. Know what is ready, what needs care, and what to wear instead.</p>
    </div><button className="lc-refresh" disabled={busy||refreshing} onClick={()=>void updateNow()}><RefreshCw size={16}/> Refresh status</button></div>
    {error&&<div className="lc-notice lc-error" role="alert"><AlertCircle size={17}/><span>{error}</span><button aria-label="Dismiss" onClick={()=>setError('')}><X size={16}/></button></div>}
    {notice&&<div className="lc-notice lc-ok" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button aria-label="Dismiss" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <div className="lc-stats">
      <div><Shirt size={21}/><small>Ready for outfits</small><strong>{inRotation}</strong><span>Clean and ready</span></div>
      <div><WashingMachine size={21}/><small>Wash + drying</small><strong>{laundryCount}</strong><span>Temporarily unavailable</span></div>
      <div><Wrench size={21}/><small>Repair required</small><strong>{byStatus.REPAIR.length}</strong><span>Needs attention</span></div>
      <div><AlertCircle size={21}/><small>Affected saved looks</small><strong>{problemOutfits.length}</strong><span>Need a replacement or clean item</span></div>
    </div>
    <div className="lc-section-heading"><div><div className="overline">01 / GARMENT CARE</div><h2>Move pieces through the cycle</h2></div><small>Each action updates your wardrobe and saved outfits.</small></div>
    <div className="lc-cycle"><div>Worn</div><ChevronRight size={18}/><div>Laundry</div><ChevronRight size={18}/><div>Drying</div><ChevronRight size={18}/><div>Ready</div></div>
    <div className="lc-lanes">
      {lanes.filter(l=>l.status!=='AVAILABLE'||showReady).map(lane=><div key={lane.status} className="lc-lane">
        <div className="lc-lane-heading">
          <div><h3>{lane.label}</h3><p>{lane.desc}</p></div>
          <span>{byStatus[lane.status].length}</span>
        </div>
        {byStatus[lane.status].length===0?<div className="lc-no-items">No pieces here</div>:
          <div className="lc-card-grid">{byStatus[lane.status].map(item=><article className="lc-item" key={item.id}>
            {thumb(item)}
            <div className="lc-item-info"><strong>{item.name}</strong><small>{pretty(item.category)} · {item.brand||'Unbranded'}</small></div>
            <div className="lc-item-actions">{actions[lane.status].map(action=>
              <button disabled={busy} className={action.primary?'primary':''} key={action.to}
                onClick={()=>void transition(item,action.to)}>{action.primary&&<Check size={14}/>} {action.label}</button>)}</div>
          </article>)}</div>}
      </div>)}
    </div>
    <button className="lc-toggle-ready" onClick={()=>setShowReady(s=>!s)}>
      {showReady?'Hide':'Show'} {byStatus.AVAILABLE.length} ready-to-wear pieces <ChevronRight size={15}/>
    </button>
    <div className="lc-section-heading lc-margin"><div><div className="overline">02 / OUTFIT RECOVERY</div><h2>Keep your looks wearable</h2></div><small>Smart substitutions from the items you actually own.</small></div>
    {problemOutfits.length===0?<div className="lc-all-ready"><CheckCircle2 size={29}/><div><h3>All saved looks are ready.</h3><p>When a piece goes into laundry or repair, affected outfits will appear here.</p></div></div>:
      <div className="lc-affected-list">{problemOutfits.map(outfit=><article key={outfit.id} className="lc-affected">
        <div className="lc-affected-top">
          <div><span className="overline">{pretty(outfit.occasion)} · {outfit.garmentIds.length} pieces</span><h3>{outfit.name}</h3>
            <p>{outfit.warnings.join(' ')}</p></div>
          <button disabled={busy||loadingAlternatives!==null} className="lc-outline" onClick={()=>void loadAlternatives(outfit.id)}>
            <Sparkles size={15}/>{loadingAlternatives===outfit.id?'Looking…':'Find replacements'}</button>
        </div>
        {suggestions[outfit.id]&&<div className="lc-suggestions">
          {suggestions[outfit.id].map(group=><div key={group.garmentId} className="lc-suggestion-group">
            <h4>Replace: {group.garmentName}</h4><small>{group.reason}</small>
            {group.alternatives.length===0?<p>No clean same-category alternatives available. Try washing the original, adding another item, or editing the outfit.</p>:
              <div className="lc-alternative-list">{group.alternatives.map(item=><button disabled={busy} key={item.id} onClick={()=>void applyAlternative(outfit,group.garmentId,item.id)}>
                {thumb(item)}<span><strong>{item.name}</strong><small>Ready · {pretty(item.category)}</small></span><ArrowRight size={16}/></button>)}</div>}
          </div>)}
        </div>}
      </article>)}</div>}
    <div className="lc-more-outfits"><button onClick={onGoOutfits}>Open Outfit Studio <ArrowRight size={16}/></button></div>
    <div className="lc-section-heading lc-margin"><div><div className="overline">03 / ACTIVITY LOG</div><h2>Recent clothing changes</h2></div><History size={21}/></div>
    <div className="lc-history">{history.length===0?
      <p className="lc-empty-history">Changes will be recorded here starting with this version. Existing items are preserved, but older status changes cannot be reconstructed.</p>:
      history.map(event=><div className="lc-event" key={event.id}><div className="lc-event-icon"><Clock3 size={17}/></div>
        <div><strong>{event.garmentName}</strong><span>{pretty(event.fromStatus)} → {pretty(event.toStatus)} · {event.origin==='MANUAL'?'Closet status menu':'Laundry workflow'}</span></div>
        <time dateTime={event.changedAt}>{new Date(event.changedAt).toLocaleString()}</time>
      </div>)}</div>
    <p className="lc-note">Status changes are stored persistently. Replacement options are deterministic matches by garment category, with occasion and season considered for ordering. No clothing is automatically marked washed, and suggested swaps are applied only when you select them.</p>
  </section>;
}
