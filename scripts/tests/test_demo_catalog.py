"""Standard-library tests; no network or H2 database needed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('demo_catalog',ROOT/'seed-wardrobe-catalog.py')
demo=importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)

class CatalogTests(unittest.TestCase):
    def test_40_distinct_and_well_balanced(self):
        self.assertEqual(len(demo.DATA),40)
        self.assertEqual(len(set(x[0] for x in demo.DATA)),40)
        self.assertEqual(len(set(x[1] for x in demo.DATA)),40)
        from collections import Counter
        kinds=Counter(x[2] for x in demo.DATA)
        self.assertEqual(kinds,{'TOPS':11,'BOTTOMS':8,'OUTERWEAR':5,
                               'DRESSES':4,'FOOTWEAR':7,'ACCESSORIES':5})
        self.assertEqual(len(set(x[3] for x in demo.DATA)),40)
        self.assertTrue(all(x[3].startswith('#') and len(x[3])==7 for x in demo.DATA))
        self.assertTrue(all(len(demo.notes_for(x[0]))<=500 for x in demo.DATA))
    def test_license_checks_avoid_nonderivative_noncommercial(self):
        for name in ['CC BY 4.0','CC-BY-SA-3.0','CC0 1.0','Public domain']:
            self.assertTrue(demo.license_allowed(name),name)
        for name in ['CC BY-NC 4.0','CC-BY-ND-4.0','All rights reserved','GFDL','CC BY-NC-SA-3.0','']:
            self.assertFalse(demo.license_allowed(name),name)
    def test_repeat_existing_entries_are_not_duplicated(self):
        x=demo.DATA[0]
        old={'id':3,'name':x[1],'status':'AVAILABLE','imageUrl':'/api/garments/3/photo',
             'notes':demo.notes_for(x[0])}
        calls=[]
        def fake_api(base,path,body=None,**kwargs):
            calls.append((path,body))
            if path=='/api/health':return {'app':'THREADWORK','status':'ok','phase':'8'}
            if path=='/api/laundry/history':return []
            if path=='/api/garments':return [old]
            if path=='/api/summary':return {'totalItems':1,'savedOutfits':0,'totalWears':0}
            if path=='/api/garments/3/status':return old
            if path=='/api/garments/3/photo':return old
            if path=='/api/garments/3':return old
            if path=='/api/garments':return [old]
            if path.startswith('/api/garments') and isinstance(body,dict):
                raise RuntimeError('Simulated: stop before creating new items')
            return old
        with patch.object(demo,'api_request',side_effect=fake_api):
            self.assertEqual(demo.main(['--dry-run']),0)
        self.assertFalse(any(path=='/api/garments' and body is not None for path,body in calls))
    def test_reject_unknown_server(self):
        with patch.object(demo,'api_request',return_value={'app':'OTHER','phase':'1'}):
            self.assertEqual(demo.main(['--yes']),2)
    def test_restrict_download_host(self):
        with self.assertRaises(ValueError):
            demo.get_photo('http://localhost:8080/admin')
        with self.assertRaises(ValueError):
            demo.get_photo('https://evil.example.com/foo.jpg')
    def test_full_import_and_safe_repeat(self):
        existing=[{'id':900+i,'name':f'Existing personal piece {i}','notes':'',
                   'status':'AVAILABLE','imageUrl':None} for i in range(9)]
        garments=list(existing)
        count={'next':1000,'created':0,'uploaded':0}
        def backend(base,path,body=None,**kw):
            if path=='/api/health':return {'app':'THREADWORK','status':'ok','phase':'8'}
            if path=='/api/laundry/history':return []
            if path=='/api/summary':return {'totalItems':len(garments),'savedOutfits':3,'totalWears':9}
            if path=='/api/garments' and body is None:return garments
            if path=='/api/garments' and isinstance(body,dict):
                record={**body,'id':count['next'],'status':'AVAILABLE','imageUrl':None}
                count['next']+=1;count['created']+=1
                garments.append(record)
                return record
            if path.endswith('/photo'):
                ident=int(path.split('/')[3]); record=next(g for g in garments if g['id']==ident)
                record['imageUrl']=f'/api/garments/{ident}/photo?ref=abc'
                count['uploaded']+=1
                return record
            if path.startswith('/api/garments/'):
                ident=int(path.split('/')[3]); record=next(g for g in garments if g['id']==ident)
                record.update(body)
                return record
            raise AssertionError(f'Unexpected endpoint: {path} {kw}')
        def images(item,used):
            yield ('File:'+item[0]+'.jpg','https://upload.wikimedia.org/fake/'+item[0]+'.jpg',
                   'CC0 1.0',{'Artist':{'value':'<b>Demo Photographer</b>'},'LicenseUrl':{'value':'https://creativecommons.org/publicdomain/zero/1.0/'}})
        with tempfile.TemporaryDirectory() as td,patch.object(demo,'api_request',side_effect=backend),\
             patch.object(demo,'candidates_for',side_effect=images),\
             patch.object(demo,'get_photo',return_value=(b'\xff\xd8\xff','image/jpeg','jpg')),\
             patch.object(demo,'credits_path',return_value=Path(td)/'credits.csv'):
            self.assertEqual(demo.main(['--yes']),0)
            self.assertEqual(len(garments),49)
            self.assertEqual(count,{'next':1040,'created':40,'uploaded':40})
            self.assertTrue(all(g['imageUrl'] for g in garments if 'TW-DEMO40' in g['notes']))
            self.assertEqual(len(demo.load_credits(Path(td)/'credits.csv')),40)
            self.assertEqual(demo.main(['--yes']),0)
            self.assertEqual(len(garments),49)
            self.assertEqual(count['created'],40)
            self.assertEqual(count['uploaded'],40)
            self.assertEqual(sum('TW-DEMO40' in g['notes'] for g in existing),0)

    def test_markup_attribution_text(self):
        self.assertEqual(demo.StripHTML().plain('Jane &amp; <b>John</b>'),'Jane & John')

if __name__=='__main__':unittest.main()
