#!/usr/bin/env python3
"""Import 40 distinctly styled demo garments with reusable Commons photographs.

Uses only Python's standard library and THREADWORK's existing API. Existing garments,
wear logs, outfits, and photos are never changed. Repeat executions fill missing
photos and avoid duplicating items with the TW-DEMO40 marker.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, timedelta
from html import unescape
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote, urlparse
from urllib.request import Request, urlopen

TAG = 'TW-DEMO40'
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
USER_AGENT = 'THREADWORK-DemoCatalog/1.0 (github.com/Veloce5/threadwork; Wikimedia Commons image attribution included)'
DATA = [
    # code, garment name, category, color, price, season, occasion, desired status, Wikimedia search terms
    ('tee-white', 'Cloud White Crew Tee', 'TOPS', '#F7F5EC', 18, 'ALL_SEASONS', 'EVERYDAY', 'AVAILABLE', 'white t-shirt|white cotton shirt'),
    ('tee-navy', 'Navy Striped Breton Tee', 'TOPS', '#233B62', 32, 'SPRING', 'EVERYDAY', 'AVAILABLE', 'striped t-shirt|breton shirt'),
    ('polo-green', 'Forest Green Polo Shirt', 'TOPS', '#205640', 42, 'SUMMER', 'WORK', 'AVAILABLE', 'green polo shirt|polo shirt'),
    ('oxford-blue', 'Sky Blue Oxford Shirt', 'TOPS', '#91B8DB', 58, 'ALL_SEASONS', 'WORK', 'AVAILABLE', 'blue button down shirt|blue shirt'),
    ('chambray', 'Chambray Button-Down', 'TOPS', '#6E8DA9', 52, 'SPRING', 'EVERYDAY', 'AVAILABLE', 'chambray shirt|denim shirt'),
    ('linen-shirt', 'Sand Linen Camp Shirt', 'TOPS', '#DBC9A1', 48, 'SUMMER', 'EVERYDAY', 'AVAILABLE', 'linen shirt|short sleeve shirt'),
    ('flannel-rust', 'Rust Plaid Flannel', 'TOPS', '#AB593F', 54, 'AUTUMN', 'EVERYDAY', 'AVAILABLE', 'plaid flannel shirt|checkered shirt'),
    ('hoodie-grey', 'Heather Grey Hoodie', 'TOPS', '#939799', 46, 'WINTER', 'EVERYDAY', 'WORN', 'grey hoodie|hooded sweatshirt'),
    ('sweater-cream', 'Cream Cable-Knit Sweater', 'TOPS', '#E9E3CE', 78, 'WINTER', 'WORK', 'AVAILABLE', 'cable knit sweater|knitted sweater'),
    ('turtleneck', 'Charcoal Turtleneck', 'TOPS', '#45474A', 66, 'WINTER', 'FORMAL', 'AVAILABLE', 'black turtleneck|turtleneck sweater'),
    ('running-tee', 'Coral Training Tee', 'TOPS', '#E27364', 29, 'SUMMER', 'ACTIVE', 'AVAILABLE', 'sports t-shirt|running shirt'),
    ('jeans-indigo', 'Indigo Straight Jeans', 'BOTTOMS', '#27466C', 82, 'ALL_SEASONS', 'EVERYDAY', 'AVAILABLE', 'blue jeans|denim jeans'),
    ('jeans-black', 'Black Slim Jeans', 'BOTTOMS', '#242629', 79, 'ALL_SEASONS', 'EVERYDAY', 'AVAILABLE', 'black jeans|black denim trousers'),
    ('chinos', 'Khaki Cotton Chinos', 'BOTTOMS', '#AC9675', 69, 'SPRING', 'WORK', 'AVAILABLE', 'khaki chinos|chino trousers'),
    ('trousers', 'Slate Tailored Trousers', 'BOTTOMS', '#59636C', 94, 'ALL_SEASONS', 'FORMAL', 'AVAILABLE', 'grey dress trousers|suit trousers'),
    ('cargo', 'Olive Utility Cargos', 'BOTTOMS', '#64734E', 74, 'AUTUMN', 'EVERYDAY', 'LAUNDRY', 'cargo pants|cargo trousers'),
    ('linen-shorts', 'Stone Linen Shorts', 'BOTTOMS', '#C8B59C', 38, 'SUMMER', 'EVERYDAY', 'AVAILABLE', 'linen shorts|khaki shorts'),
    ('running-shorts', 'Black Running Shorts', 'BOTTOMS', '#2C2D33', 31, 'SUMMER', 'ACTIVE', 'AVAILABLE', 'running shorts|sports shorts'),
    ('skirt-pleat', 'Navy Pleated Midi Skirt', 'BOTTOMS', '#263A56', 57, 'SPRING', 'WORK', 'AVAILABLE', 'pleated skirt|midi skirt'),
    ('jacket-denim', 'Blue Denim Jacket', 'OUTERWEAR', '#6085AC', 102, 'AUTUMN', 'EVERYDAY', 'AVAILABLE', 'denim jacket|blue jean jacket'),
    ('trench', 'Camel Trench Coat', 'OUTERWEAR', '#B79669', 185, 'AUTUMN', 'WORK', 'AVAILABLE', 'trench coat|beige coat'),
    ('shell', 'Slate Waterproof Shell', 'OUTERWEAR', '#596978', 125, 'SPRING', 'ACTIVE', 'DRYING', 'rain jacket|waterproof jacket'),
    ('bomber', 'Olive Bomber Jacket', 'OUTERWEAR', '#6B7853', 115, 'AUTUMN', 'EVERYDAY', 'AVAILABLE', 'bomber jacket|flight jacket'),
    ('puffer', 'Burgundy Puffer Jacket', 'OUTERWEAR', '#793F53', 160, 'WINTER', 'EVERYDAY', 'AVAILABLE', 'puffer jacket|quilted jacket'),
    ('sundress', 'Floral Summer Sundress', 'DRESSES', '#E7A7A5', 72, 'SUMMER', 'EVERYDAY', 'AVAILABLE', 'floral sundress|floral summer dress'),
    ('dress-midi', 'Black Satin Midi Dress', 'DRESSES', '#303036', 118, 'ALL_SEASONS', 'FORMAL', 'AVAILABLE', 'black midi dress|black evening dress'),
    ('shirt-dress', 'Pale Blue Shirt Dress', 'DRESSES', '#A0C3D3', 84, 'SPRING', 'WORK', 'AVAILABLE', 'shirt dress|blue dress'),
    ('dress-red', 'Deep Red Evening Dress', 'DRESSES', '#A63D4D', 155, 'AUTUMN', 'FORMAL', 'AVAILABLE', 'red evening dress|red formal dress'),
    ('sneakers-white', 'Classic White Sneakers', 'FOOTWEAR', '#F0EEE8', 89, 'ALL_SEASONS', 'EVERYDAY', 'AVAILABLE', 'white sneakers|white trainers'),
    ('loafers-brown', 'Brown Leather Loafers', 'FOOTWEAR', '#704A37', 125, 'ALL_SEASONS', 'WORK', 'AVAILABLE', 'brown loafers|leather loafers'),
    ('trainers-black', 'Black Running Trainers', 'FOOTWEAR', '#242831', 110, 'ALL_SEASONS', 'ACTIVE', 'AVAILABLE', 'running shoes|black trainers'),
    ('boots-chelsea', 'Tan Suede Chelsea Boots', 'FOOTWEAR', '#AF7C57', 145, 'AUTUMN', 'WORK', 'REPAIR', 'chelsea boots|ankle boots'),
    ('slip-ons', 'Navy Canvas Slip-Ons', 'FOOTWEAR', '#38516E', 65, 'SUMMER', 'EVERYDAY', 'AVAILABLE', 'canvas slip on shoes|canvas shoes'),
    ('sandals', 'Tan Summer Sandals', 'FOOTWEAR', '#C28C59', 51, 'SUMMER', 'EVERYDAY', 'AVAILABLE', 'leather sandals|summer sandals'),
    ('oxfords', 'Black Dress Oxfords', 'FOOTWEAR', '#292A2C', 154, 'ALL_SEASONS', 'FORMAL', 'AVAILABLE', 'oxford shoes|black formal shoes'),
    ('belt', 'Cognac Leather Belt', 'ACCESSORIES', '#855035', 39, 'ALL_SEASONS', 'WORK', 'AVAILABLE', 'brown leather belt|leather belt'),
    ('tote', 'Natural Canvas Tote', 'ACCESSORIES', '#E0D0A7', 26, 'ALL_SEASONS', 'EVERYDAY', 'AVAILABLE', 'canvas tote bag|tote bag'),
    ('beanie', 'Ribbed Navy Beanie', 'ACCESSORIES', '#31455C', 28, 'WINTER', 'EVERYDAY', 'AVAILABLE', 'knitted beanie|winter knit hat'),
    ('scarf', 'Patterned Silk Scarf', 'ACCESSORIES', '#BE7372', 68, 'SPRING', 'FORMAL', 'LAUNDRY', 'silk scarf|patterned scarf'),
    ('watch', 'Minimal Silver Wristwatch', 'ACCESSORIES', '#B2B7BC', 132, 'ALL_SEASONS', 'WORK', 'AVAILABLE', 'silver wristwatch|wristwatch'),
]

class StripHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)
    def plain(self, value):
        self.feed(value)
        return ' '.join(unescape(''.join(self.parts)).split())

def api_request(base, path, body=None, *, method=None, content_type='application/json'):
    headers = {'Accept': 'application/json', 'User-Agent': USER_AGENT}
    if body is not None:
        headers['Content-Type'] = content_type
        body = json.dumps(body).encode() if content_type == 'application/json' else body
    request = Request(base.rstrip('/') + path, data=body, headers=headers,
                      method=method or ('POST' if body is not None else 'GET'))
    try:
        with urlopen(request, timeout=20) as response:
            result = response.read(6_000_000)
            return json.loads(result) if result else None
    except HTTPError as exc:
        details = exc.read(1000).decode('utf-8', 'replace')
        raise RuntimeError(f'HTTP {exc.code}: {details[:200]}') from exc

def license_allowed(name):
    n = name.strip().lower().replace('_', ' ').replace('-', ' ')
    return bool(re.fullmatch(r'cc by(?: sa)?(?: \d+(?:\.\d+)?)?', n) or
                re.fullmatch(r'cc0(?: \d+(?:\.\d+)?)?', n) or
                re.fullmatch(r'(?:public domain|pdm|pd)(?: \d+(?:\.\d+)?)?', n))

def search_candidates(term, commons_api=COMMONS_API):
    query = urlencode({
        'action':'query', 'format':'json', 'formatversion':'2', 'generator':'search',
        'gsrsearch':term, 'gsrnamespace':'6', 'gsrlimit':'25',
        'prop':'imageinfo', 'iiprop':'url|mime|extmetadata', 'iiurlwidth':'600',
        'iiextmetadatafilter':'LicenseShortName|LicenseUrl|Artist|Copyrighted',
    })
    req=Request(commons_api+'?'+query, headers={'User-Agent':USER_AGENT,
                                                'Accept':'application/json'})
    for attempt in range(3):
        try:
            with urlopen(req, timeout=20) as response:
                obj=json.loads(response.read(2_500_000))
            if 'error' in obj:
                raise RuntimeError(str(obj['error'])[:300])
            return obj.get('query',{}).get('pages',[])
        except (HTTPError,URLError,TimeoutError) as e:
            if attempt==2: raise RuntimeError(f'Wikimedia Commons unavailable: {e}') from e
            time.sleep(1+attempt*2)
    return []

def candidates_for(item, used, commons_api=COMMONS_API):
    code, name, category, *_rest, search_terms = item
    already=set()
    for term in search_terms.split('|'):
        pages=search_candidates(term, commons_api)
        scored=[]
        for page in pages:
            title=page.get('title','')
            image=(page.get('imageinfo') or [{}])[0]
            meta=image.get('extmetadata') or {}
            lic=meta.get('LicenseShortName',{}).get('value','')
            source=image.get('thumburl') or image.get('url')
            mime=image.get('thumbmime') or image.get('mime') or ''
            if (not source or not source.startswith('https://') or title in used or title in already
                    or urlparse(source).hostname != 'upload.wikimedia.org'):continue
            if mime.lower() not in ('image/jpeg','image/png'):continue
            if not license_allowed(lic):continue
            low=title.lower()
            exclusions=('logo','emblem','icon','drawing','painting','museum','politician',
                        'map ','flag ','stamp','advertisement','pattern diagram','portrait')
            if any(w in low for w in exclusions):continue
            keywords={w for w in re.findall(r'[a-z]+',term.lower()) if len(w)>2}
            score=sum(5 for w in keywords if w in low)
            if '.jpg' in low or '.jpeg' in low:score+=2
            if 'clothes' in low or 'garment' in low:score+=1
            scored.append((score, title, source, lic, meta))
        for _, title, url, lic, meta in sorted(scored, key=lambda x:(-x[0],len(x[1]))):
            already.add(title)
            yield title,url,lic,meta

def get_photo(url):
    if urlparse(url).scheme!='https' or urlparse(url).hostname!='upload.wikimedia.org':
        raise ValueError('Only Wikimedia Commons image hosts are allowed')
    req=Request(url,headers={'User-Agent':USER_AGENT,'Accept':'image/jpeg,image/png'})
    with urlopen(req,timeout=25) as response:
        if response.headers.get('Content-Length') and int(response.headers['Content-Length'])>4_000_000:
            raise ValueError('Image too large')
        raw=response.read(4_000_001)
    if len(raw)>4_000_000:raise ValueError('Image exceeds 4 MB')
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):return raw, 'image/png', 'png'
    if raw.startswith(b'\xff\xd8\xff'):return raw,'image/jpeg','jpg'
    raise ValueError('Not a JPEG or PNG')

def multipart(file_bytes, extension):
    boundary='ThreadworkDemoUploadBound42'
    start=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
           f'filename="demo.{extension}"\r\nContent-Type: image/{"jpeg" if extension=="jpg" else "png"}\r\n\r\n').encode()
    return start+file_bytes+f'\r\n--{boundary}--\r\n'.encode(),f'multipart/form-data; boundary={boundary}'

def record_id(code):return f'[{TAG}:{code}]'

def notes_for(code, source=None, license_name='', author=''):
    base=f'{record_id(code)} Demo catalog piece for feature testing, not an owned item. Reference photograph may differ in color or details.'
    if source:
        credit=f' Photo: {source} | {license_name} | {author[:60]}'
        return (base+credit)[:500]
    return base

def credits_path():
    return Path(__file__).resolve().parents[1]/'backend'/'data'/'demo-photo-credits.csv'

def load_credits(path):
    if not path.exists():return {}
    with path.open(newline='',encoding='utf8') as stream:
        return {row['code']:row for row in csv.DictReader(stream)}

def save_credits(path, credits):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix('.csv.tmp')
    with tmp.open('w',newline='',encoding='utf8') as stream:
        writer=csv.DictWriter(stream,fieldnames=['code','name','source','file','author','license','license_url'])
        writer.writeheader()
        writer.writerows(credits[k] for k in sorted(credits))
    tmp.replace(path)

def preview(items, existing):
    print(f'Backend currently contains {len(existing)} garments; importing up to {len(items)} distinct demo pieces.')
    for category in ['TOPS','BOTTOMS','OUTERWEAR','DRESSES','FOOTWEAR','ACCESSORIES']:
        print(f'  {category.title():12s}: {sum(1 for x in items if x[2]==category)}')
    print('Images: licensed Wikimedia Commons photos, with per-photo credit stored locally.')

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api',default='http://127.0.0.1:8080',help='THREADWORK Java backend origin')
    parser.add_argument('--dry-run',action='store_true',help='Review catalog only; no uploads')
    parser.add_argument('--yes',action='store_true',help='Skip the interactive confirmation')
    opts=parser.parse_args(argv)
    if len(DATA)!=40 or len({x[0] for x in DATA})!=40:
        raise RuntimeError('Catalog needs exactly 40 unique IDs')
    if opts.api not in ('http://127.0.0.1:8080','http://localhost:8080'):
        raise RuntimeError('For safety, only the original localhost:8080 backend is supported')
    try:
        health=api_request(opts.api,'/api/health')
        if health.get('app')!='THREADWORK' or health.get('status')!='ok' or int(health.get('phase','0'))<8:
            raise RuntimeError('Connected to an outdated or unexpected backend; no changes made')
        api_request(opts.api,'/api/laundry/history')
        existing=api_request(opts.api,'/api/garments')
        summary=api_request(opts.api,'/api/summary')
    except Exception as e:
        print(f'STOP: Cannot safely verify the current THREADWORK backend: {e}',file=sys.stderr)
        return 2
    preview(DATA,existing)
    print(f"The connected database reports {summary['totalItems']} garments, {summary['savedOutfits']} saved outfits, and {summary['totalWears']} recorded garment wears.")
    if opts.dry_run:return 0
    if not opts.yes:
        if input('Type IMPORT to add missing demo garments and photos: ').strip()!='IMPORT':
            print('Cancelled; nothing changed.');return 0
    current={match.group(1):g for g in existing if (match:=re.search(r'\['+TAG+r':([a-z0-9-]+)\]',g.get('notes') or ''))}
    missing=[x for x in DATA if x[0] not in current or not current[x[0]].get('imageUrl')]
    if missing:
        print('Checking Commons image access before importing…')
        try:
            first=next(candidates_for(missing[0],set()),None)
            if first is None:raise RuntimeError('No usable freely licensed photo found')
            get_photo(first[1])
        except Exception as e:
            print(f'STOP: Could not fetch Commons photos ({e}). No new garments were created; try again when the connection is available.',file=sys.stderr)
            return 2
    credits=load_credits(credits_path())
    used={v['file'] for v in credits.values() if v.get('file')}
    for g in existing:
        match=re.search(r'Photo: (https://commons\.wikimedia\.org/wiki/[^ |]+)',g.get('notes') or '')
        if match:used.add('File:'+match.group(1).rsplit('/',1)[-1].replace('_',' '))
    created=0; photos=0; statuses=0; failures=[]
    for idx,item in enumerate(DATA,1):
        code,name,category,color,price,season,occasion,status,terms=item
        garment=current.get(code)
        if not garment:
            payload={'name':name,'category':category,'brand':'THREADWORK Sample',
                     'color':color,'purchasePrice':price,
                     'purchasedOn':(date.today()-timedelta(days=27+(idx*31)%690)).isoformat(),
                     'notes':notes_for(code), 'season':season,'occasion':occasion}
            try:
                garment=api_request(opts.api,'/api/garments',payload)
                current[code]=garment;created+=1
            except Exception as e:
                failures.append(f'{name}: unable to create ({e})')
                print(f'[{idx}/40] FAILED creating {name}: {e}')
                continue
        success_image=bool(garment.get('imageUrl'))
        if success_image and code in credits and 'Photo:' not in (garment.get('notes') or ''):
            try:
                row=credits[code]
                update={k:garment.get(k) for k in ['name','category','brand','color','purchasePrice',
                            'purchasedOn','season','occasion']}
                update['notes']=notes_for(code,row['source'],row['license'],row['author'])
                garment=api_request(opts.api,f"/api/garments/{garment['id']}",update,method='PUT')
            except Exception as credit_error:
                failures.append(f'{name}: photo credit is preserved in local CSV but notes update failed ({credit_error})')
        if not success_image:
            try:
                candidates=list(candidates_for(item,used))
            except Exception as e:
                candidates=[];failures.append(f'{name}: Commons lookup failed ({e})')
            for title,url,license_name,meta in candidates[:10]:
                try:
                    blob,mime,extension=get_photo(url)
                    data,content_type=multipart(blob,extension)
                    uploaded=api_request(opts.api,f"/api/garments/{garment['id']}/photo",data,
                                         content_type=content_type)
                    if not uploaded.get('imageUrl'):raise RuntimeError('No imageUrl returned')
                    file_page='https://commons.wikimedia.org/wiki/'+quote(title.replace(' ','_'),safe=':()')
                    author=StripHTML().plain(meta.get('Artist',{}).get('value','Unknown'))
                    license_url=meta.get('LicenseUrl',{}).get('value','')
                    # Persist legal credits immediately after a successful image upload.
                    # Even if updating the item's notes fails, the local credits file remains.
                    credits[code]={'code':code,'name':name,'source':file_page,'file':title,
                                   'author':author,'license':license_name,'license_url':license_url}
                    save_credits(credits_path(),credits)
                    used.add(title);photos+=1;success_image=True
                    updated={k:garment.get(k) for k in ['name','category','brand','color','purchasePrice',
                            'purchasedOn','season','occasion']}
                    updated['notes']=notes_for(code,file_page,license_name,author)
                    try:
                        api_request(opts.api,f"/api/garments/{garment['id']}",updated,method='PUT')
                    except Exception as credit_error:
                        failures.append(f'{name}: photo attached, attribution stored in CSV but item notes update failed ({credit_error})')
                    break
                except Exception as e:
                    print(f'    Image candidate skipped ({type(e).__name__}): {str(e)[:105]}')
            if not success_image:failures.append(f'{name}: NO PHOTO (retry the script once Commons is reachable)')
        if garment.get('status')!=status:
            try:
                api_request(opts.api,f"/api/garments/{garment['id']}/status",{'status':status},method='PATCH')
                statuses+=1
            except Exception as e:
                failures.append(f'{name}: could not set status to {status}: {e}')
        print(f'[{idx:02d}/40] {name} — '+('photo ready' if success_image else 'PHOTO MISSING'))
        if idx % 5==0:time.sleep(0.4)
    print(f'\nDone. Created {created} new demo garments; attached {photos} new photos; updated {statuses} statuses.')
    print(f'Photo credits: {credits_path()}')
    if failures:
        print(f'{len(failures)} issue(s) remain:')
        for f in failures:print('  - '+f)
        print('Run the same command again to retry missing garments/photos without duplicating completed items.')
        return 1
    print('All 40 catalog entries have photos. Existing wardrobe items were not changed.')
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except (KeyboardInterrupt,EOFError):
        print('\nImport interrupted. Rerun safely to resume.');sys.exit(130)
