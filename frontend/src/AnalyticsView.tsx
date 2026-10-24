import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, CheckCircle2, Clock3, DollarSign,
  History, Plus, Shirt, TrendingDown, X } from 'lucide-react';
import { api } from './api';
import type { Garment, OutfitRecord, WearAnalyticsData, WearEvent } from './api';
import './analytics.css';

const currency=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const readableDate=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
function MiniImage({url,color,name}:{url:string|null;color?:string;name:string}){
  return <span className="wa-mini" style={{backgroundColor:color?color+'20':undefined}}>
    {url?<img src={url} alt={name} loading="lazy"/>:<Shirt size={23}/>}
  </span>;
}
export function AnalyticsView({items,onChanged,onGoCloset}:{items:Garment[],onChanged:()=>Promise<void>,onGoCloset:()=>void}){
  const [report,setReport]=useState<WearAnalyticsData|null>(null);
  const [history,setHistory]=useState<WearEvent[]>([]);
  const [outfits,setOutfits]=useState<OutfitRecord[]>([]);
  const [mode,setMode]=useState<'OUTFIT'|'ITEM'>('OUTFIT');
  const [outfitId,setOutfitId]=useState('');
  const [garmentId,setGarmentId]=useState('');
  const [wornOn,setWornOn]=useState(localDate);
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true);
  const [sort,setSort]=useState<'WEARS'|'PRICE'|'LOW_COST'>('WEARS');
  const refresh=useCallback(async()=>{
    try{
      const [stats,events,looks]=await Promise.all([api.wearAnalytics(),api.wearHistory(),api.outfits()]);
      setReport(stats);setHistory(events);setOutfits(looks);setError('');
    }catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh()},[refresh]);
  const byId=useMemo(()=>new Map(items.map(item=>[item.id,item])),[items]);
  const today=wornOn===localDate();
  const chosenOutfit=outfits.find(o=>String(o.id)===outfitId);
  const chosenGarment=items.find(i=>String(i.id)===garmentId);
  const canLog=mode==='OUTFIT'?
    !!chosenOutfit&&(!today||chosenOutfit.available):
    !!chosenGarment&&(!today||chosenGarment.status==='AVAILABLE');
  async function log(){
    if(!canLog)return;
    try{
      setBusy(true);setError('');
      const data=mode==='OUTFIT'?{wornOn,outfitId:Number(outfitId),notes}:
        {wornOn,garmentIds:[Number(garmentId)],notes};
      await api.logWear(data);
      await onChanged();await refresh();
      setNotes('');setNotice('Wear recorded for '+readableDate(wornOn)+'.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  const last14=useMemo(()=>{
    const values=new Map((report?.daily||[]).map(day=>[day.date,day.garmentWears]));
    return Array.from({length:14},(_,index)=>{
      const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-(13-index));
      const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
      return {date:key,count:values.get(key)||0};
    });
  },[report]);
  const maxDaily=Math.max(1,...last14.map(p=>p.count));
  const ranked=useMemo(()=>{
    const rows=[...(report?.items||[])];
    if(sort==='PRICE')rows.sort((a,b)=>b.purchasePrice-a.purchasePrice);
    if(sort==='LOW_COST')rows.sort((a,b)=>a.costPerWear===null?1:b.costPerWear===null?-1:a.costPerWear-b.costPerWear);
    return rows;
  },[report,sort]);
  return <section className="wa-root">
    <div className="page-heading"><div>
      <div className="overline"><span className="gold-line"/> WARDROBE INTELLIGENCE · PHASE 5</div>
      <h1>Wardrobe analytics<span>.</span></h1>
      <p>Understand how often you wear your wardrobe and what each recorded wear costs.</p>
    </div><span className="wa-phase"><Activity size={14}/> Wear history is live</span></div>
    {error&&<div className="wa-banner error" role="alert"><span>{error}</span><button onClick={()=>setError('')} aria-label="Close"><X size={16}/></button></div>}
    {notice&&<div className="wa-banner success" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Close"><X size={16}/></button></div>}
    <div className="wa-metrics">
      <div><span>WEAR LOGS</span><History size={18}/><strong>{report?.totalWearEvents??'—'}</strong><small>Logged outfits or items</small></div>
      <div><span>GARMENT WEARS</span><Shirt size={18}/><strong>{report?.garmentWears??'—'}</strong><small>Individual pieces worn</small></div>
      <div><span>PIECES WITH HISTORY</span><CheckCircle2 size={18}/><strong>{report?.wornPieces??'—'}</strong><small>Of {items.length} garments</small></div>
      <div><span>WARDROBE VALUE</span><DollarSign size={18}/><strong className="wa-money">{report?currency(report.wardrobeValue):'—'}</strong><small>Recorded purchase prices</small></div>
    </div>
    <div className="wa-layout">
      <section className="wa-panel">
        <div className="wa-panel-head"><div className="overline">01 / WEAR JOURNAL</div><h2>Log a wear</h2><p>Record what you wore and when. A saved outfit logs every garment it contains.</p></div>
        <div className="wa-tabs"><button className={mode==='OUTFIT'?'selected':''} onClick={()=>setMode('OUTFIT')}>Saved outfit</button><button className={mode==='ITEM'?'selected':''} onClick={()=>setMode('ITEM')}>Single garment</button></div>
        {mode==='OUTFIT'?<label className="wa-field">Choose a saved outfit
          <select value={outfitId} onChange={e=>setOutfitId(e.target.value)}>
            <option value="">Select an outfit</option>
            {outfits.map(o=><option key={o.id} value={o.id}>{o.name} · {o.garmentIds.length} pieces{o.available?'':' · unavailable today'}</option>)}
          </select>
        </label>:<label className="wa-field">Choose a garment
          <select value={garmentId} onChange={e=>setGarmentId(e.target.value)}>
            <option value="">Select a piece</option>
            {items.map(g=><option key={g.id} value={g.id}>{g.name}{g.status==='AVAILABLE'?'':' · '+g.status.toLowerCase()}</option>)}
          </select>
        </label>}
        <label className="wa-field">Date worn
          <input type="date" max={localDate()} value={wornOn} onChange={e=>setWornOn(e.target.value)}/>
        </label>
        <label className="wa-field">Notes (optional)
          <textarea maxLength={200} rows={3} placeholder="Where did you wear it? What was the occasion?" value={notes} onChange={e=>setNotes(e.target.value)}/>
        </label>
        {today&&((mode==='OUTFIT'&&chosenOutfit&&!chosenOutfit.available)||
          (mode==='ITEM'&&chosenGarment&&chosenGarment.status!=='AVAILABLE'))&&
          <p className="wa-warning">This selection contains unavailable clothing. You can log a past date, or return the pieces to Ready in Laundry Center before logging today.</p>}
        <button className="wa-submit" onClick={()=>void log()} disabled={busy||!canLog||!wornOn}>
          <Plus size={17}/>{busy?'Recording…':'Record wear'}
        </button>
        <p className="wa-disclaimer">Today's wear moves currently available pieces to Worn in Laundry Center. Logging a past wear does not change today's availability. Past logs are not reconstructed automatically.</p>
      </section>
      <section className="wa-panel">
        <div className="wa-panel-head"><div className="overline">02 / THE PAST TWO WEEKS</div><h2>Wear activity</h2><p>Actual logged garment wears per day. Multiple pieces in one outfit count separately.</p></div>
        <div className="wa-chart" role="img" aria-label={'Last 14 days of garment wear logs: '+last14.map(day=>day.date+': '+day.count).join(', ')}>
          {last14.map(day=><div className="wa-chart-col" key={day.date} title={day.date+': '+day.count+' garment wears'}>
            <span className="wa-chart-num">{day.count||''}</span>
            <div className="wa-chart-track"><div className={'wa-chart-bar '+(day.count?'active':'')} style={{height:day.count?Math.max(9,day.count/maxDaily*100)+'%':'3px'}}/></div>
            <span className="wa-chart-day">{new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)}</span>
          </div>)}
        </div>
        <div className="wa-chart-footer"><TrendingDown size={17}/> {report?.neverLoggedPieces??0} wardrobe pieces have no recorded wears yet. This measures logging activity, not time spent wearing clothes.</div>
      </section>
    </div>
    <section className="wa-panel wa-wide">
      <div className="wa-panel-head wa-inline"><div><div className="overline">03 / COST PER WEAR</div><h2>Your wardrobe, item by item</h2><p>Cost per wear = purchase price ÷ recorded wears. Zero-wear items show an em dash, never a misleading $0.</p></div>
        <label className="wa-sort">Sort by <select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="WEARS">Most worn</option><option value="PRICE">Highest price</option><option value="LOW_COST">Lowest cost per wear</option></select></label>
      </div>
      <div className="wa-table-scroll"><table className="wa-table"><thead><tr><th>Garment</th><th>Purchase price</th><th>Wears</th><th>Cost per wear</th><th>Last recorded wear</th></tr></thead>
        <tbody>{ranked.map(g=><tr key={g.garmentId}><td><div className="wa-table-piece"><MiniImage url={g.imageUrl} name={g.name}/><span><strong>{g.name}</strong><small>{g.category.toLowerCase()}</small></span></div></td>
          <td>{currency(g.purchasePrice)}</td><td>{g.wearCount}</td>
          <td><strong>{g.costPerWear===null?'—':currency(g.costPerWear)}</strong></td>
          <td>{g.lastWorn?readableDate(g.lastWorn):'Not yet recorded'}</td>
        </tr>)}</tbody>
      </table></div>
      {ranked.length===0&&<div className="wa-empty">Nothing to analyze yet. <button onClick={onGoCloset}>Add a garment</button> to get started.</div>}
    </section>
    <section className="wa-panel wa-wide">
      <div className="wa-panel-head"><div className="overline">04 / ACTIVITY HISTORY</div><h2>Your wear timeline</h2><p>These are dated records saved in your wardrobe database.</p></div>
      {loading?<p className="wa-empty">Loading history…</p>:history.length===0?<div className="wa-empty"><CalendarDays size={26}/><p>Your wear history is empty. Record a wear above to begin.</p></div>:
        <div className="wa-history">{history.slice(0,30).map(event=><article key={event.id}>
          <div className="wa-history-date"><Clock3 size={17}/>{readableDate(event.wornOn)}</div>
          <div><strong>{event.outfitName||event.garmentIds.map(id=>byId.get(id)?.name||'Removed garment').join(' + ')}</strong>
            <small>{event.garmentIds.length} piece{event.garmentIds.length===1?'':'s'} · {event.notes||'No notes'}</small></div>
        </article>)}</div>}
    </section>
    <p className="wa-footnote">Cost-per-wear estimates depend on the accuracy of your recorded purchase prices and wear history. All calculations use saved wear events; no AI predictions or estimates of unlogged wears are included.</p>
  </section>;
}
