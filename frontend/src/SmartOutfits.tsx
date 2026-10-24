import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, ArrowRight, CheckCircle2, Heart, Layers, PackageCheck, Plus,
  RefreshCw, Shirt, Sparkles, WandSparkles, X
} from 'lucide-react';
import { api } from './api';
import type { Garment, Occasion, RecommendationPack, Season } from './api';
import './smart.css';

const occasions:Occasion[]=['EVERYDAY','WORK','FORMAL','ACTIVE','OTHER'];
const seasons:Season[]=['ALL_SEASONS','SPRING','SUMMER','AUTUMN','WINTER'];
const pretty=(s:string)=>s==='ALL_SEASONS'?'Any season':s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function thumb(item:Garment){
  return <div className="sg-piece-visual" style={{backgroundColor:item.color+'20'}}>
    {item.imageUrl?<img src={item.imageUrl} alt={item.name} loading="lazy"/>:<Shirt size={35} strokeWidth={1.2} color={item.color}/>}
  </div>;
}
export function SmartOutfits({onChanged,onGoLaundry,onGoStudio}:{
  onChanged:()=>Promise<void>;onGoLaundry:()=>void;onGoStudio:()=>void
}){
  const [occasion,setOccasion]=useState<Occasion>('EVERYDAY');
  const [season,setSeason]=useState<Season>('ALL_SEASONS');
  const [requireLayer,setRequireLayer]=useState(false);
  const [results,setResults]=useState<RecommendationPack|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [lastRefresh,setLastRefresh]=useState(0);
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{setResults(await api.recommendations(occasion,season,requireLayer));}
    catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[occasion,season,requireLayer]);
  useEffect(()=>{void refresh()},[refresh,lastRefresh]);
  async function save(index:number) {
    const match=results?.suggestions[index];
    if(!match)return;
    const proposed=`Recommended: ${match.garments.map(g=>g.name).join(' + ')}`;
    const name=proposed.length<=80?proposed:proposed.slice(0,77)+'…';
    try{
      setBusy(index);setError('');
      // The Java backend validates that garments still exist at save time.
      await api.createOutfit({name,occasion,garmentIds:match.garmentIds});
      await onChanged();
      setNotice('Saved to your Outfit Studio. Choose a different look or open your lookbook.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(null);}
  }
  return <section className="sg-root">
    <div className="page-heading">
      <div><div className="overline"><span className="gold-line"/> PERSONAL STYLING ENGINE · PHASE 6</div>
        <h1>Smart outfits<span>.</span></h1>
        <p>Turn ready-to-wear pieces into explainable combinations. Every suggestion comes from your own closet.</p>
      </div>
      <span className="sg-pill"><WandSparkles size={15}/> Java recommendation engine</span>
    </div>
    {error&&<div className="sg-banner error" role="alert"><AlertCircle size={16}/>{error}<button aria-label="Dismiss" onClick={()=>setError('')}><X size={16}/></button></div>}
    {notice&&<div className="sg-banner success" role="status"><CheckCircle2 size={16}/>{notice}<button aria-label="Dismiss" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <div className="sg-panel">
      <div className="sg-panel-heading"><div><span className="overline">01 / STYLE PREFERENCES</span><h2>Build from what is ready</h2>
        <p>We filter out unavailable pieces first, then prioritize the labels you choose.</p></div>
        <button className="sg-refresh" onClick={()=>setLastRefresh(x=>x+1)} disabled={loading}><RefreshCw size={15}/> Recheck closet</button></div>
      <div className="sg-controls">
        <label>Occasion
          <select value={occasion} onChange={e=>setOccasion(e.target.value as Occasion)}>{occasions.map(o=><option key={o} value={o}>{pretty(o)}</option>)}</select>
        </label>
        <label>Season
          <select value={season} onChange={e=>setSeason(e.target.value as Season)}>{seasons.map(o=><option key={o} value={o}>{pretty(o)}</option>)}</select>
        </label>
        <label className="sg-check">
          <input type="checkbox" checked={requireLayer} onChange={e=>setRequireLayer(e.target.checked)}/>
          <span><strong>Require an outer layer</strong><small>For days when you want a jacket or coat</small></span>
        </label>
      </div>
      <p className="sg-note">Occasion and season are preference labels, not weather forecasts or judgments about personal style. A layer becomes mandatory only if you select it.</p>
    </div>
    <div className="sg-panel-heading sg-results-head"><div><span className="overline">02 / RESULTS FROM YOUR CLOSET</span>
      <h2>{loading?'Building your looks…':results?.suggestions.length? `${results.suggestions.length} combinations worth exploring`:'Your available options'}</h2></div>
      <span className="sg-count">{results?.eligiblePieces??'—'} ready-to-wear pieces</span>
    </div>
    {loading?<div className="sg-empty"><RefreshCw size={30}/><h3>Checking your closet…</h3></div>:
    results?.blockers.length?<div className="sg-empty">
      <AlertCircle size={34}/>
      <h3>No complete outfits meet your constraints.</h3>
      <p>The generator does not use garments marked Worn, Laundry, Drying, or Repair.</p>
      <div className="sg-blockers">{results.blockers.map((reason,i)=><div key={i}><AlertCircle size={16}/>{reason}</div>)}</div>
      <div className="sg-actions"><button className="button-dark" onClick={onGoLaundry}>Open Laundry Center <ArrowRight size={16}/></button><button className="sg-secondary" onClick={()=>{setRequireLayer(false);setSeason('ALL_SEASONS')}}>Relax preferences</button></div>
    </div>:results?.suggestions.length?
      <div className="sg-results">{results.suggestions.map((look,i)=><article key={look.garmentIds.join('-')} className="sg-card">
        <div className="sg-card-upper"><span className="overline">LOOK {String(i+1).padStart(2,'0')}</span>
          <span className="sg-score"><Sparkles size={14}/> Match score {look.score}</span></div>
        <div className="sg-card-images">{look.garments.map(g=><div className="sg-card-piece" key={g.id}>{thumb(g)}<strong>{g.name}</strong><small>{pretty(g.category)}</small></div>)}</div>
        <div className="sg-card-bottom"><div><h3>{look.title}</h3><p>{look.garments.length} real wardrobe pieces · All ready to wear</p></div>
          <button disabled={busy!==null} onClick={()=>void save(i)}><Plus size={16}/>{busy===i?'Saving…':'Save look'}</button>
        </div>
        <div className="sg-reasons"><span className="overline">WHY THIS COMBINATION?</span>{look.reasons.map((r,j)=><div key={j}><CheckCircle2 size={15}/>{r}</div>)}</div>
      </article>)}</div>:
      <div className="sg-empty"><PackageCheck size={32}/><h3>Not enough options yet.</h3><p>Add more available garments to build new combinations.</p></div>}
    <div className="sg-footer"><div><Layers size={21}/><span><strong>Every suggestion is yours to decide.</strong>
      <small>The score is a transparent heuristic based on your own garment labels and recorded wear counts, not a fashion rating.</small></span></div>
      <button onClick={onGoStudio}>Open saved looks <ArrowRight size={17}/></button>
    </div>
    <p className="sg-disclosure"><Heart size={14}/> Recommendations are generated locally by Java. They are not AI-created outfits, do not predict the weather, and never alter your wardrobe unless you save a suggestion.</p>
  </section>;
}
