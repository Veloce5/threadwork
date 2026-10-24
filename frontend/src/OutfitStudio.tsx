import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, CirclePlus, GripVertical, Heart, PackageCheck, Pencil, Plus, Save, Shirt, Sparkles, Trash2, X } from 'lucide-react';
import { api } from './api';
import type { Garment, Occasion, OutfitRecord } from './api';
import './outfits.css';

type Slot='TOPS'|'BOTTOMS'|'FOOTWEAR'|'OUTERWEAR'|'ACCESSORIES';
const slots: Slot[]=['TOPS','BOTTOMS','FOOTWEAR','OUTERWEAR','ACCESSORIES'];
const names:Record<Slot,string>={TOPS:'Top or dress',BOTTOMS:'Bottom',FOOTWEAR:'Shoes',OUTERWEAR:'Layer',ACCESSORIES:'Accessory'};
const occasions:Occasion[]=['EVERYDAY','WORK','FORMAL','ACTIVE','OTHER'];
const blank=():Record<Slot,number|null>=>({TOPS:null,BOTTOMS:null,FOOTWEAR:null,OUTERWEAR:null,ACCESSORIES:null});
const slotFor=(g:Garment):Slot=>g.category==='DRESSES'?'TOPS':g.category;
const nice=(v:string)=>v.toLowerCase().replace(/\\b\\w/g,c=>c.toUpperCase());
const statusText=(v:string)=>v==='AVAILABLE'?'Ready to wear':nice(v);

function ItemArt({item}:{item:Garment}){
  return <div className="tw-item-art" style={{backgroundColor:item.color+'28'}}>
    {item.imageUrl?<img src={item.imageUrl} alt={item.name} loading="lazy"/>:<Shirt size={27} strokeWidth={1.25} color={item.color}/>}
  </div>;
}
function OutfitPreview({outfit}:{outfit:OutfitRecord}){
  return <div className="tw-saved-preview">{outfit.garments.slice(0,5).map(item=><div key={item.id} className="tw-preview-item"><ItemArt item={item}/></div>)}</div>;
}
export function OutfitStudio({items,onChanged,onGoCloset}:{items:Garment[],onChanged:()=>Promise<void>,onGoCloset:()=>void}){
  const [outfits,setOutfits]=useState<OutfitRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [editingId,setEditingId]=useState<number|null>(null);
  const [chosen,setChosen]=useState<Record<Slot,number|null>>(blank);
  const [name,setName]=useState('');
  const [occasion,setOccasion]=useState<Occasion>('EVERYDAY');
  const [category,setCategory]=useState<Slot|'ALL'>('ALL');
  const [search,setSearch]=useState('');
  const [onlyAvailable,setOnlyAvailable]=useState(false);
  const refresh=useCallback(async()=>{
    try{setOutfits(await api.outfits());setError('');}
    catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh()},[items,refresh]);
  const garmentsById=useMemo(()=>new Map(items.map(i=>[i.id,i])),[items]);
  const picked=slots.map(slot=>({slot,item:chosen[slot]==null?null:garmentsById.get(chosen[slot]!)||null}));
  const count=picked.filter(x=>x.item).length;
  const unavailable=picked.filter(x=>x.item&&x.item.status!=='AVAILABLE').map(x=>x.item!);
  const canSave=name.trim().length>0&&count>=2;
  const library=items.filter(item=>
    (category==='ALL'||slotFor(item)===category) &&
    (!onlyAvailable||item.status==='AVAILABLE') &&
    (item.name+' '+item.brand+' '+item.category).toLowerCase().includes(search.toLowerCase().trim())
  );
  function addItem(item:Garment){
    const slot=slotFor(item);
    setChosen(current=>({...current,[slot]:item.id}));
    setNotice(item.name+' added to '+names[slot].toLowerCase()+'.');
  }
  function dropItem(event:DragEvent<HTMLDivElement>,slot:Slot){
    event.preventDefault();
    const id=Number(event.dataTransfer.getData('text/plain'));
    const item=garmentsById.get(id);
    if(!item){setError('This piece is no longer in your closet.');return;}
    if(slotFor(item)!==slot){setError('Drop this piece into the '+names[slot].toLowerCase()+' slot.');return;}
    addItem(item);setError('');
  }
  function reset(){
    setChosen(blank());setEditingId(null);setName('');setOccasion('EVERYDAY');setError('');
  }
  function edit(outfit:OutfitRecord){
    const next=blank();
    outfit.garments.forEach(g=>{next[slotFor(g)]=g.id});
    setChosen(next);setEditingId(outfit.id);setName(outfit.name);setOccasion(outfit.occasion);setNotice('Editing '+outfit.name+'.');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  async function save(){
    if(!canSave)return;
    const body={name:name.trim(),occasion,garmentIds:slots.map(s=>chosen[s]).filter((id):id is number=>id!==null)};
    try{
      setBusy(true);setError('');
      if(editingId!==null)await api.updateOutfit(editingId,body);
      else await api.createOutfit(body);
      reset();
      await refresh();await onChanged();setNotice('Outfit saved to your wardrobe.');
    }catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }
  async function remove(outfit:OutfitRecord){
    if(!window.confirm('Delete saved outfit "'+outfit.name+'"? Your garments will not be deleted.'))return;
    try{setBusy(true);await api.deleteOutfit(outfit.id);if(editingId===outfit.id)reset();await refresh();await onChanged();setNotice('Saved outfit deleted.');}
    catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }
  return <div className="tw-studio">
    <div className="page-heading"><div>
      <div className="overline"><span className="gold-line"/> OUTFIT ATELIER · PHASE 3</div>
      <h1>Outfit studio<span>.</span></h1>
      <p>Style your own pieces, build combinations, and keep your favorites.</p>
    </div><span className="tw-studio-count">{outfits.length} saved outfits</span></div>
    {error&&<div className="tw-banner tw-error" role="alert"><AlertCircle size={16}/>{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {notice&&<div className="tw-banner tw-success" role="status"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={16}/></button></div>}
    <div className="tw-studio-layout">
      <section className="tw-library">
        <div className="tw-panel-head"><div><span className="overline">01 / YOUR COLLECTION</span><h2>Choose your pieces</h2></div><span>{library.length}</span></div>
        <label className="tw-library-search"><span className="sr-only">Find clothing</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a garment…"/></label>
        <div className="tw-category-pills">
          {(['ALL',...slots] as const).map(s=><button key={s} className={category===s?'active':''} onClick={()=>setCategory(s)}>{s==='ALL'?'All':names[s]}</button>)}
        </div>
        <label className="tw-available-toggle"><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)}/> Only show ready-to-wear pieces</label>
        <div className="tw-library-scroll">
          {library.length===0?<div className="tw-library-empty"><Shirt size={28}/><p>No matching clothing items.</p><button onClick={onGoCloset}>Manage wardrobe</button></div>:
            library.map(item=><button key={item.id} className={'tw-library-item '+(item.status!=='AVAILABLE'?'not-ready':'')} draggable
              onDragStart={e=>{e.dataTransfer.setData('text/plain',String(item.id));e.dataTransfer.effectAllowed='copy'}}
              onClick={()=>addItem(item)} title={'Add '+item.name+' to outfit'}>
              <ItemArt item={item}/><span className="tw-library-text"><strong>{item.name}</strong><small>{nice(item.category)} · {statusText(item.status)}</small></span><Plus size={16}/><GripVertical className="tw-grip" size={14}/>
            </button>)}
        </div>
        <p className="tw-hint">Click an item, or drag it into its matching outfit slot. Choosing another item in the same slot replaces it.</p>
      </section>
      <section className="tw-canvas-panel">
        <div className="tw-panel-head"><div><span className="overline">02 / YOUR CANVAS</span><h2>{editingId===null?'Build a look':'Edit saved look'}</h2></div><button className="tw-reset" onClick={reset}><ArrowLeft size={15}/> Clear</button></div>
        <div className="tw-canvas-grid">
          {slots.map(slot=>{
            const item=garmentsById.get(chosen[slot]||-1);
            return <div className={'tw-slot '+(item?'filled':'')} key={slot}
              onDragOver={e=>e.preventDefault()} onDrop={e=>dropItem(e,slot)}>
              <div className="tw-slot-heading"><span>{names[slot]}</span>{item&&<button aria-label={'Remove '+item.name} onClick={()=>setChosen(x=>({...x,[slot]:null}))}><X size={14}/></button>}</div>
              {item?<><ItemArt item={item}/><strong>{item.name}</strong><small>{statusText(item.status)}</small></>:
                <div className="tw-slot-empty"><Plus size={22}/><small>Drag here or select from closet</small></div>}
            </div>;
          })}
        </div>
        <div className="tw-outfit-editor">
          <label>Outfit name<input maxLength={80} placeholder="e.g. Saturday coffee run" value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>Occasion<select value={occasion} onChange={e=>setOccasion(e.target.value as Occasion)}>{occasions.map(o=><option key={o} value={o}>{nice(o)}</option>)}</select></label>
        </div>
        <div className="tw-outfit-check">
          {unavailable.length?<><AlertCircle size={17}/><span>{unavailable.map(x=>x.name).join(', ')} {unavailable.length===1?'is':'are'} currently unavailable. You can still save the look.</span></>:
          <><Check size={17}/><span>{count>=2?'All selected pieces are available.':'Select at least two different pieces to save an outfit.'}</span></>}
        </div>
        <div className="tw-save-row"><span>{count} / 5 slots filled</span><button className="button-dark" disabled={busy||!canSave} onClick={()=>void save()}><Save size={17}/>{busy?'Saving…':editingId!==null?'Save changes':'Save outfit'}</button></div>
      </section>
    </div>
    <section className="tw-saved-section">
      <div className="tw-panel-head"><div><span className="overline">03 / THE LOOKBOOK</span><h2>Your saved outfits</h2></div><span>{outfits.length}</span></div>
      {loading?<p className="tw-saved-empty">Loading your saved outfits…</p>:outfits.length===0?
        <div className="tw-saved-empty"><Sparkles size={34}/><h3>Your lookbook starts here.</h3><p>Mix two or more wardrobe pieces and save your first combination.</p></div>:
        <div className="tw-saved-grid">{outfits.map(outfit=><article key={outfit.id} className="tw-saved-card">
          <OutfitPreview outfit={outfit}/>
          <div className="tw-saved-info"><span className="overline">{nice(outfit.occasion)}</span><h3>{outfit.name}</h3><p>{outfit.garmentIds.length} pieces · {outfit.available?'Everything is ready':'Items need attention'}</p></div>
          <div className={'tw-availability '+(outfit.available?'ok':'warning')}>
            {outfit.available?<><PackageCheck size={15}/> Ready to wear</>:<><AlertCircle size={15}/> Unavailable</>}
          </div>
          {outfit.warnings.length>0&&<ul className="tw-warnings">{outfit.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}
          <div className="tw-saved-actions"><button disabled={busy} onClick={()=>edit(outfit)}><Pencil size={15}/> Edit</button><button disabled={busy} onClick={()=>void remove(outfit)}><Trash2 size={15}/> Delete</button></div>
        </article>)}</div>
      }
    </section>
    <p className="tw-footnote"><Heart size={13}/> Looks reference your saved closet. Availability is recalculated when garments change status. This is a manual outfit builder; AI ranking comes in a later phase.</p>
  </div>;
}
