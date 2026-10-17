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
 def test_statement_limit_boundary_preserves_full_text(self):
  for length in [65537,333315,524288]:
   with self.subTest(length=length):
    text='x'*length
    records,_=extract(self.sample('<root>'+case().replace('Education services',text)+'</root>'),'apc261011.zip')
    self.assertEqual(records[0]['goods'][0]['text'],text)
  with self.assertRaises(FeedError):
   extract(self.sample('<root>'+case().replace('Education services','x'*524289)+'</root>'),'apc261011.zip')
 def test_large_evidence_splits_batches_without_changing_record_limit(self):
  records=[{'name':'x','goods':[{'class':'041','text':'x'*524288}]} for _ in range(2)]
  calls=[]
  def call(endpoint,key,p):calls.append(p);return {'id':'file','complete':p['action']=='complete'}
  ingest('endpoint','secret','apc261011.zip','a'*64,records,call)
  batches=[p for p in calls if p['action']=='batch']
  self.assertEqual([len(p['records']) for p in batches],[1,1])
  self.assertEqual([p['records'][0]['goods'][0]['text'] for p in batches],['x'*524288]*2)
  self.assertTrue(all(len(json.dumps(p,ensure_ascii=False).encode())<1048576 for p in batches))
  calls.clear()
  with self.assertRaises(FeedError):
   ingest('endpoint','secret','apc261011.zip','a'*64,[{'goods':[{'text':'x'*500000},{'text':'y'*500000}]}],call)
  self.assertNotIn('batch',[p['action'] for p in calls]);self.assertNotIn('complete',[p['action'] for p in calls])
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
class DiagnosticTests(unittest.TestCase):
 def capture(self, action):
  from contextlib import redirect_stdout
  output=io.StringIO()
  with redirect_stdout(output):
   with self.assertRaises(Exception): action()
  result=output.getvalue()
  for secret in ['ODP-PRIVATE', 'INGEST-PRIVATE', 'signed-private', 'body-private', 'header-private', 'https://']:
   self.assertNotIn(secret,result)
  return result
 def test_untrusted_error_text_and_filename_never_reach_log(self):
  from runner import diagnostic
  def action():
   with diagnostic('archive-download','apc261011.zip?signature=signed-private'):
    raise FeedError('ODP-PRIVATE INGEST-PRIVATE body-private header-private https://private')
  result=self.capture(action)
  self.assertIn('archive-download reason=validation-or-request-failed',result)
  self.assertNotIn('file=',result)
 def test_http_status_survives_request_sanitizing(self):
  import runner, urllib.error
  from unittest.mock import patch
  error=urllib.error.HTTPError('https://private?signature=signed-private',403,'body-private',{'secret':'header-private'},io.BytesIO(b'body-private'))
  def action():
   with runner.diagnostic('catalog-request'):
    with patch.object(runner.OPENER,'open',side_effect=error):
     runner.request(runner.API+'/trtdxfap','ODP-PRIVATE')
  self.assertIn('catalog-request reason=http-status=403',self.capture(action))
 def run_failure(self, failure):
  import runner, urllib.error
  from unittest.mock import patch
  today=dt.datetime.now(dt.timezone.utc).date();filename='apc'+today.strftime('%y%m%d')+'.zip'
  item={'fileName':filename,'fileSize':3,'fileLastModifiedDateTime':'public-revision','fileDownloadURI':runner.API+'/files/TRTDXFAP/'+filename}
  catalog={'bulkDataProductBag':[{'productIdentifier':'TRTDXFAP','productFileBag':{'count':1,'fileDataBag':[item]}}]}
  if failure=='metadata':item.pop('fileLastModifiedDateTime')
  inventory={'files':[]} if failure!='inventory' else {'body-private':'signed-private'}
  responses=[catalog,inventory]
  if failure=='catalog':responses=[FeedError('ODP-PRIVATE',503)]
  error=urllib.error.HTTPError('https://private?signature=signed-private',403,'body-private',{},None)
  def action():
   with patch.dict(runner.os.environ,{'ODP_API_KEY':'ODP-PRIVATE','WATCH_INGEST_KEY':'INGEST-PRIVATE'}),patch.object(runner,'request',side_effect=responses),patch.object(runner.ARCHIVE_OPENER,'open',side_effect=error) as download,patch.object(runner,'ingest') as upload,patch.object(runner,'run_checks') as checks:
    try:runner.run('test')
    finally:
     upload.assert_not_called();checks.assert_not_called()
     if failure!='download':download.assert_not_called()
  return self.capture(action),filename
 def test_catalog_failure_identified_without_remote_body(self):
  self.assertIn('catalog-request reason=http-status=503',self.run_failure('catalog')[0])
 def test_inventory_structure_failure_identified(self):
  self.assertIn('inventory-validation reason=unexpected-error',self.run_failure('inventory')[0])
 def test_missing_revision_identifies_public_filename_before_download(self):
  output,filename=self.run_failure('metadata')
  self.assertIn('source-metadata file='+filename+' reason=validation-or-request-failed',output)
 def test_download_denial_identifies_file_and_http_status(self):
  output,filename=self.run_failure('download')
  self.assertIn('archive-download file='+filename+' reason=http-status=403',output)
 def test_unsafe_http_status_is_not_printed(self):
  from runner import diagnostic
  def action():
   with diagnostic('file-ingestion','apc261011.zip'):
    raise FeedError('body-private',http_status='INGEST-PRIVATE')
  self.assertIn('file=apc261011.zip reason=validation-or-request-failed',self.capture(action))
 def test_valid_archive_ingestion_and_queue_stages_preserve_order(self):
  self.full_pipeline(None)
 def test_archive_ingestion_and_queue_failures_are_distinguishable(self):
  for failure in ['archive-validation','file-ingestion','client-checks']:
   with self.subTest(stage=failure):self.full_pipeline(failure)
 def full_pipeline(self,failure):
  import runner
  from contextlib import redirect_stdout
  from unittest.mock import patch
  today=dt.datetime.now(dt.timezone.utc).date();filename='apc'+today.strftime('%y%m%d')+'.zip'
  archive=io.BytesIO()
  with zipfile.ZipFile(archive,'w') as z:z.writestr(filename[:-4]+'.xml','<root>'+case(filing=today.strftime('%Y%m%d'))+'</root>')
  payload=archive.getvalue() if failure!='archive-validation' else b'body-private signed-private'
  item={'fileName':filename,'fileSize':len(payload),'fileLastModifiedDateTime':'public-revision','fileDownloadURI':runner.API+'/files/TRTDXFAP/'+filename}
  catalog={'bulkDataProductBag':[{'productIdentifier':'TRTDXFAP','productFileBag':{'count':1,'fileDataBag':[item]}}]}
  output=io.StringIO()
  with redirect_stdout(output),patch.dict(runner.os.environ,{'ODP_API_KEY':'ODP-PRIVATE','WATCH_INGEST_KEY':'INGEST-PRIVATE'}),patch.object(runner,'request',side_effect=[catalog,{'files':[]}]),patch.object(runner.ARCHIVE_OPENER,'open',return_value=io.BytesIO(payload)),patch.object(runner,'ingest',side_effect=FeedError('INGEST-PRIVATE body-private',409) if failure=='file-ingestion' else None) as upload,patch.object(runner,'run_checks',side_effect=FeedError('INGEST-PRIVATE body-private') if failure=='client-checks' else None) as checks:
   if failure:
    with self.assertRaises(FeedError):runner.run('test')
   else:runner.run('test')
  result=output.getvalue()
  for secret in ['ODP-PRIVATE','INGEST-PRIVATE','body-private','signed-private','https://']:self.assertNotIn(secret,result)
  if failure:
   self.assertIn('Watch failed: '+failure,result)
   if failure=='file-ingestion':self.assertIn('http-status=409',result)
   if failure!='client-checks':checks.assert_not_called()
   if failure=='archive-validation':upload.assert_not_called()
  else:
   self.assertNotIn('Watch failed:',result);upload.assert_called_once();checks.assert_called_once()
   self.assertEqual(upload.call_args.args[0],runner.ENDPOINTS['test'])
   self.assertEqual(upload.call_args.args[2],filename)
   self.assertEqual(upload.call_args.args[4][0]['name'],'EXAMPLE')
   self.assertLess(result.index('archive-validation'),result.index('file-ingestion'))
   self.assertLess(result.index('file-ingestion'),result.index('client-checks'))
 def test_sample_cli_never_prints_untrusted_path_or_traceback(self):
  import subprocess
  process=subprocess.run(['python3',str(Path(__file__).with_name('runner.py')),'--sample','/missing/ODP-PRIVATE-signed-private.zip'],capture_output=True,text=True)
  self.assertEqual(process.returncode,1)
  self.assertIn('Watch failed: sample-validation reason=validation-or-request-failed',process.stdout)
  self.assertIn('No completed check is claimed.',process.stdout)
  self.assertNotIn('ODP-PRIVATE',process.stdout);self.assertEqual(process.stderr,'')

if __name__=='__main__':unittest.main()
