import datetime as dt, io, json, tempfile, unittest, zipfile
from pathlib import Path
from runner import extract, manifest, ingest, run_checks, FeedError

CASE='''<case-file><serial-number>{serial}</serial-number><case-file-header><filing-date>{filing}</filing-date><mark-identification>EXAMPLE</mark-identification><mark-drawing-code>{drawing}</mark-drawing-code><status-code>630</status-code></case-file-header><case-file-statements><case-file-statement><type-code>GS0411</type-code><text>Education services</text></case-file-statement></case-file-statements><classifications><classification><international-code>041</international-code></classification></classifications><case-file-owners><case-file-owner><party-name>Example LLC</party-name></case-file-owner></case-file-owners></case-file>'''
def case(serial='01234567',filing='20261011',drawing='4'): return CASE.format(**locals())
class RunnerTests(unittest.TestCase):
 def sample(self,xml,member='apc261011.xml'):
  temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);path=Path(temp.name)/'file.zip'
  with zipfile.ZipFile(path,'w') as z:z.writestr(member,xml)
  return path
 def test_public_evidence_and_exclusions(self):
  path=self.sample('<root>'+case()+case('12345678','20000101')+case('23456789',drawing='3')+'</root>')
  r,c=extract(path,'apc261011.zip');self.assertEqual(len(r),1);self.assertEqual(c,{'total':3,'outside_lookback':1,'excluded_drawing':1,'missing_filing_date':0,'missing_word_name':0})
  self.assertEqual(r[0]['classes'],['41']);self.assertEqual(r[0]['goods'],[{'class':'041','text':'Education services'}]);self.assertEqual(r[0]['owners'],['Example LLC'])
 def test_long_official_description_is_preserved_and_missing_date_is_counted(self):
  text='Services '+('x'*42149)
  xml='<root>'+case().replace('Education services',text)+case('12345678').replace('<filing-date>20261011</filing-date>','')+'</root>'
  records,counts=extract(self.sample(xml),'apc261011.zip')
  self.assertEqual(records[0]['goods'][0]['text'],text)
  self.assertEqual(len(records),1);self.assertEqual(counts['missing_filing_date'],1)
 def test_missing_mark_wording_is_counted_without_placeholder_matches(self):
  xml='<root>'+case()+case('12345678').replace('<mark-identification>EXAMPLE</mark-identification>','')+'</root>'
  records,counts=extract(self.sample(xml),'apc261011.zip')
  self.assertEqual(len(records),1);self.assertEqual(counts['missing_word_name'],1)
 def test_certification_goods_and_classes_are_preserved(self):
  for code in ['A','B']:
   xml=('<root>'+case()+'</root>').replace('GS0411','GS'+code+'  1').replace('<international-code>041</international-code>','<international-code>'+code+'</international-code>')
   records,_=extract(self.sample(xml),'apc261011.zip')
   self.assertEqual(records[0]['classes'],[code]);self.assertEqual(records[0]['goods'],[{'class':code,'text':'Education services'}])
 def test_stylized_word_is_text_only(self):self.assertEqual(len(extract(self.sample('<root>'+case(drawing='5')+'</root>'),'apc261011.zip')[0]),1)
 def test_entities_malformed_future_dates_duplicate_fail_file(self):
  for xml in ['<!DOCTYPE root [<!ENTITY x "bomb">]><root>'+case()+'</root>','<root>'+case(),'<root>'+case(filing='20261012')+'</root>','<root>'+case(filing='20260230')+'</root>','<root>'+case()+case()+'</root>','<root/>']:
   with self.subTest(xml=xml[:40]),self.assertRaises(Exception):extract(self.sample(xml),'apc261011.zip')
 def test_utf16_cannot_hide_entity_declarations(self):
  with self.assertRaises(FeedError):extract(self.sample(('<root>'+case()+'</root>').encode('utf-16')),'apc261011.zip')
 def test_archive_paths_not_extracted(self):
  with self.assertRaises(FeedError):extract(self.sample('<root>'+case()+'</root>','../apc261011.xml'),'apc261011.zip')
 def test_30_day_late_arrival_boundary(self):
  r,c=extract(self.sample('<root>'+case(filing='20260911')+case('12345678','20260910')+'</root>'),'apc261011.zip');self.assertEqual(len(r),1);self.assertEqual(c['outside_lookback'],1)
 def product(self):
  rows=[{'fileName':n,'fileSize':100,'fileDownloadURI':'https://api.uspto.gov/api/v1/datasets/products/files/TRTDXFAP/'+n} for n in ['apc261011.zip','apc261012.zip']]
  return {'bulkDataProductBag':[{'productIdentifier':'TRTDXFAP','productFileBag':{'count':2,'fileDataBag':rows}}]}
 def test_catalog_sorts_data_dates_not_latest_update(self):self.assertEqual([r['fileName'] for r in manifest(self.product(),dt.date(2026,10,13))],['apc261011.zip','apc261012.zip'])
 def test_archive_redirect_drops_credentials_and_rejects_unapproved_hosts(self):
  import urllib.request
  from runner import ArchiveRedirect
  handler=ArchiveRedirect();req=urllib.request.Request('https://api.uspto.gov/file',headers={'X-API-KEY':'fake-test-key'})
  redirected=handler.redirect_request(req,None,302,'',{},'https://example.s3.amazonaws.com/archive.zip?signature=fake')
  self.assertFalse(any(k.lower()=='x-api-key' for k,v in redirected.header_items()))
  for url in ['http://example.s3.amazonaws.com/file','https://attacker.example/file','https://example.s3.amazonaws.com.attacker.example/file','https://user@example.s3.amazonaws.com/file']:
   with self.assertRaises(FeedError):handler.redirect_request(req,None,302,'',{},url)
 def test_official_reference_documents_are_not_application_archives(self):
  p=self.product();bag=p['bulkDataProductBag'][0]['productFileBag']
  bag['fileDataBag'].append({'fileName':'Trademark Series Code_20230620.doc','fileTypeText':'Document','fileSize':27648});bag['count']=3
  self.assertEqual(len(manifest(p,dt.date(2026,10,13))),2)
 def test_manifest_truncation_redirect_destinations_and_sizes_rejected(self):
  for mutate in [lambda p:p['bulkDataProductBag'][0]['productFileBag'].update(count=99),lambda p:p['bulkDataProductBag'][0]['productFileBag']['fileDataBag'][0].update(fileDownloadURI='https://attacker.example'),lambda p:p['bulkDataProductBag'][0]['productFileBag']['fileDataBag'][0].update(fileSize=999999999)]:
   p=self.product();mutate(p)
   with self.assertRaises(FeedError):manifest(p,dt.date(2026,10,13))
 def test_chunk_retry_protocol_and_no_completion_after_failure(self):
  calls=[]
  def call(endpoint,key,p):calls.append(p);return {'id':'file','complete':p['action']=='complete'}
  ingest('endpoint','secret','apc261011.zip','a'*64,[{'name':'x'}]*101,call)
  self.assertEqual([p['action'] for p in calls],['begin','batch','batch','complete']);self.assertEqual([len(p['records']) for p in calls if p['action']=='batch'],[100,1])
  calls=[]
  def fail(endpoint,key,p):
   calls.append(p)
   if p['action']=='batch':raise FeedError('broken')
   return {'id':'file'}
  with self.assertRaises(FeedError):ingest('endpoint','secret','apc261011.zip','a'*64,[{'name':'x'}],fail)
  self.assertNotIn('complete',[p['action'] for p in calls])
 def test_completed_hash_skips_batches(self):
  calls=[]
  ingest('endpoint','secret','apc261011.zip','a'*64,[{}],lambda e,k,p:(calls.append(p) or {'complete':True}))
  self.assertEqual(len(calls),1)
 def test_queue_drains_one_client_per_call_and_stops(self):
  calls=[]
  run_checks('endpoint','secret',lambda e,k,p:(calls.append(p) or {'pending':len(calls)<3}))
  self.assertEqual(len(calls),3)
 def test_invalid_or_unfinished_queue_cannot_claim_success(self):
  for response in [{}, {'pending':True}]:
   calls=[]
   with self.assertRaises(FeedError):run_checks('endpoint','secret',lambda e,k,p:(calls.append(p) or response))
   self.assertLessEqual(len(calls),10)
if __name__=='__main__':unittest.main()
