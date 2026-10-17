"""Public USPTO feed processor. No client data, third-party packages or secret logging."""
import argparse, datetime as dt, hashlib, json, os, re, tempfile, urllib.error, urllib.request, zipfile
import xml.etree.ElementTree as ET
from contextlib import contextmanager

API = 'https://api.uspto.gov/api/v1/datasets/products'
ENDPOINTS = {'production': 'https://omvkwiosonatswocbdgx.supabase.co/functions/v1/watch-ingest',
             'test': 'https://imvkhicfmidzbzsbhkzs.supabase.co/functions/v1/watch-ingest'}
MAX_ZIP = 100 * 1024 * 1024
MAX_XML = 2 * 1024 * 1024 * 1024
MAX_RECORDS = 20000

class FeedError(Exception):
    def __init__(self, message, http_status=None):
        super().__init__(message)
        self.http_status = http_status

STAGES = frozenset(('credentials', 'catalog-request', 'catalog-validation', 'inventory-request',
                    'inventory-validation', 'source-metadata', 'archive-download',
                    'archive-validation', 'file-ingestion', 'client-checks', 'sample-validation'))

@contextmanager
def diagnostic(stage, filename=None):
    # Only fixed labels, validated public filenames and numeric HTTP status reach logs.
    # Never serialize exceptions, response bodies, headers, URLs or source field values.
    if stage not in STAGES: raise ValueError('Unknown diagnostic stage')
    label = stage
    if isinstance(filename, str) and re.fullmatch(r'apc[0-9]{6}\.zip', filename):
        label += ' file=' + filename
    print('Watch step: ' + label, flush=True)
    try:
        yield
    except Exception as error:
        status = error.code if isinstance(error, urllib.error.HTTPError) else (
            error.http_status if isinstance(error, FeedError) else None)
        if type(status) is int and 100 <= status <= 599:
            reason = 'http-status=' + str(status)
        elif isinstance(error, FeedError): reason = 'validation-or-request-failed'
        elif isinstance(error, zipfile.BadZipFile): reason = 'invalid-archive'
        elif isinstance(error, ET.ParseError): reason = 'invalid-xml'
        elif isinstance(error, (TimeoutError, OSError)): reason = 'connection-or-file-error'
        else: reason = 'unexpected-error'
        print('Watch failed: ' + label + ' reason=' + reason, flush=True)
        raise

def date(value):
    if not re.fullmatch(r'\d{8}', value or ''): raise FeedError('Invalid filing date')
    try: return dt.datetime.strptime(value, '%Y%m%d').date()
    except ValueError: raise FeedError('Invalid filing date') from None

def file_date(filename):
    if not re.fullmatch(r'apc\d{6}\.zip', filename or ''): raise FeedError('Unexpected source filename')
    return date('20' + filename[3:9])

def utf16_length(value):
    # The worker measures JavaScript string length, which counts UTF-16 code units.
    return len(value.encode('utf-16-le', errors='surrogatepass')) // 2

def validate_record(record):
    """Apply the ingestion worker's record contract before a file can be uploaded."""
    fields = {'serial', 'name', 'filing_date', 'goods', 'classes', 'owners', 'status_code'}
    whitespace = '\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
    if not isinstance(record, dict) or set(record) != fields:
        raise FeedError('Invalid application fields')
    if (not isinstance(record['serial'], str) or not re.fullmatch(r'[0-9]{8}', record['serial']) or
        not isinstance(record['name'], str) or not record['name'].strip(whitespace) or
        utf16_length(record['name']) > 4096 or not isinstance(record['status_code'], str) or
        not re.fullmatch(r'[0-9]{3}', record['status_code'])):
        raise FeedError('Invalid application identity or status')
    value = record['filing_date']
    if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', value):
        raise FeedError('Invalid application date')
    try: dt.date.fromisoformat(value)
    except ValueError: raise FeedError('Invalid application date') from None
    classes, owners, goods = record['classes'], record['owners'], record['goods']
    if (not isinstance(classes, list) or len(classes) > 45 or
        any(not isinstance(c, str) or not re.fullmatch(r'(?:[1-9]|[1-3][0-9]|4[0-5]|A|B|200)', c) for c in classes)):
        raise FeedError('Invalid application classes')
    if (not isinstance(owners, list) or len(owners) > 50 or
        any(not isinstance(o, str) or utf16_length(o) > 4096 for o in owners)):
        raise FeedError('Invalid application owners')
    if (not isinstance(goods, list) or len(goods) > 45 or
        any(not isinstance(g, dict) or set(g) != {'class', 'text'} or
            not isinstance(g['class'], str) or not re.fullmatch(r'(?:[0-9]{3}|A|B)', g['class']) or
            not isinstance(g['text'], str) or utf16_length(g['text']) > 524288 for g in goods)):
        raise FeedError('Invalid application goods')
    return record

class SafeXML:
    def __init__(self, stream): self.stream, self.tail, self.total, self.without_boundary = stream, b'', 0, 0
    def read(self, size=-1):
        chunk = self.stream.read(min(size if size > 0 else 65536, 65536))
        self.total += len(chunk)
        if self.total > MAX_XML or b'\x00' in chunk or b'<!ENTITY' in (self.tail + chunk).upper(): raise FeedError('Unsafe or oversized XML')
        scan = self.tail + chunk
        boundary = scan.rfind(b'</case-file>')
        self.without_boundary = len(scan) - boundary - 12 if boundary >= 0 else self.without_boundary + len(chunk)
        # Bounded XML sections: an unexpectedly huge case cannot exhaust memory before parse completes.
        if self.without_boundary > 1024*1024: raise FeedError('XML case/section exceeds supported size')
        self.tail = chunk[-16:]
        return chunk

def extract(path, filename):
    """Parse whole file before any upload. CRC/malformed input fails the file, not an empty run."""
    ending = file_date(filename); cutoff = ending - dt.timedelta(days=30)
    records, seen, counts = [], set(), {'total': 0, 'outside_lookback': 0, 'excluded_drawing': 0, 'missing_filing_date': 0, 'missing_word_name': 0}
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) != 1 or members[0].filename != filename[:-4] + '.xml' or members[0].flag_bits & 1:
            raise FeedError('Expected one unencrypted official XML file')
        if members[0].file_size > MAX_XML or members[0].compress_size > MAX_ZIP: raise FeedError('Archive exceeds supported size')
        with archive.open(members[0]) as stream:
            stack = []
            for event, element in ET.iterparse(SafeXML(stream), events=('start', 'end')):
                if event == 'start':
                    stack.append(element)
                    if len(stack) > 60: raise FeedError('XML nesting limit')
                    continue
                if element.tag == 'case-file':
                    counts['total'] += 1
                    header = element.find('case-file-header')
                    if header is None: raise FeedError('Missing case header')
                    raw_filing = header.findtext('filing-date')
                    if raw_filing is None or not raw_filing.strip():
                        counts['missing_filing_date'] += 1
                        if len(stack) > 1: stack[-2].remove(element)
                        element.clear(); stack.pop(); continue
                    filing = date(raw_filing)
                    if filing > ending: raise FeedError('Future filing in source')
                    if filing < cutoff: counts['outside_lookback'] += 1
                    elif header.findtext('mark-drawing-code') not in ('4', '5'): counts['excluded_drawing'] += 1
                    else:
                        serial = element.findtext('serial-number', '').strip()
                        name = header.findtext('mark-identification', '').strip()
                        if not re.fullmatch(r'\d{8}', serial):
                            raise FeedError('Invalid application serial')
                        if not name:
                            counts['missing_word_name'] += 1
                            if len(stack) > 1: stack[-2].remove(element)
                            element.clear(); stack.pop(); continue
                        if len(name) > 4096 or serial in seen:
                            raise FeedError('Invalid or duplicate application identity')
                        statements = element.findall('./case-file-statements/case-file-statement')
                        goods = [{'class': n.findtext('type-code', '')[2:5].strip(), 'text': n.findtext('text', '').strip()}
                                 for n in statements if re.fullmatch(r'GS(?:[0-9]{3}|[AB]  )[0-9]', n.findtext('type-code', ''))]
                        classes = sorted({n.text.strip().lstrip('0') or '0' for n in element.findall('./classifications/classification/international-code') if n.text})
                        # All listed owner names are retained, with no inference about historical/current ownership.
                        owners = sorted({n.text.strip() for n in element.findall('./case-file-owners/case-file-owner/party-name') if n.text})
                        if len(goods) > 45 or any(len(g['text']) > 524288 for g in goods) or len(owners) > 50:
                            raise FeedError('Record exceeds supported fields')
                        record = {'serial': serial, 'name': name, 'filing_date': filing.isoformat(),
                                        'goods': goods, 'classes': classes, 'owners': owners,
                                        'status_code': header.findtext('status-code', '')}
                        records.append(validate_record(record))
                        seen.add(serial)
                        if len(records) > MAX_RECORDS: raise FeedError('Candidate limit exceeded')
                    if len(stack) > 1: stack[-2].remove(element)
                    element.clear()
                stack.pop()
            # Exhaust member to verify ZIP CRC even for a parse that reads ahead differently.
            while stream.read(65536): pass
    if not counts['total']: raise FeedError('No case-file records in source')
    return records, counts

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): raise FeedError('Unexpected redirect')

OPENER = urllib.request.build_opener(NoRedirect())

class ArchiveRedirect(urllib.request.HTTPRedirectHandler):
    # Public archives may move to USPTO-hosted cloud storage. Never forward the API key.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        from urllib.parse import urlsplit
        target = urlsplit(newurl)
        host = target.hostname or ''
        if (target.scheme != 'https' or target.username or target.password or
            target.port not in (None, 443) or
            not (host == 'api.uspto.gov' or host.endswith('.uspto.gov') or
                 host.endswith('.amazonaws.com') or host.endswith('.cloudfront.net'))):
            raise FeedError('Unsupported archive redirect destination')
        return urllib.request.Request(newurl, headers={'Accept': 'application/zip'})

ARCHIVE_OPENER = urllib.request.build_opener(ArchiveRedirect())

def request(url, key, body=None, limit=8*1024*1024):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body, ensure_ascii=False).encode(),
                                headers={'X-API-KEY' if url.startswith(API) else 'X-Watch-Ingest-Key': key,
                                         'Accept': 'application/json', 'Content-Type': 'application/json'})
    try:
        with OPENER.open(req, timeout=120) as response:
            raw = response.read(limit+1)
            if len(raw) > limit: raise FeedError('Response limit exceeded')
            return json.loads(raw)
    except FeedError: raise
    except urllib.error.HTTPError as error:
        raise FeedError('Remote request failed; no successful check claimed', error.code) from None
    except Exception: raise FeedError('Remote request failed; no successful check claimed') from None

def manifest(payload, today):
    bag = payload.get('bulkDataProductBag')
    if not isinstance(bag, list) or len(bag) != 1 or not isinstance(bag[0], dict): raise FeedError('Unexpected product response')
    product = bag[0]
    if product.get('productIdentifier', '').upper() != 'TRTDXFAP': raise FeedError('Wrong USPTO product')
    files = product.get('productFileBag', {})
    rows = files.get('fileDataBag')
    if not isinstance(rows, list) or files.get('count') != len(rows): raise FeedError('Incomplete file manifest')
    chosen, names = [], set()
    for row in rows:
        name = row.get('fileName', '')
        # Official manifests also include reference manuals; these are not application feeds.
        if row.get('fileTypeText') == 'Document': continue
        day = file_date(name)
        if not today-dt.timedelta(days=35) <= day <= today: continue
        if name in names: raise FeedError('Duplicate source file')
        if not isinstance(row.get('fileSize'), int) or not 0 < row['fileSize'] <= MAX_ZIP: raise FeedError('Unsupported file size')
        expected_url = API + '/files/TRTDXFAP/' + name
        if row.get('fileDownloadURI') != expected_url: raise FeedError('Unexpected download destination')
        chosen.append(row); names.add(name)
    if not chosen: raise FeedError('No current source files')
    return sorted(chosen, key=lambda r: file_date(r['fileName']))

def ingest(endpoint, key, filename, revision, records, call=request, manifest_revision=None):
    result = call(endpoint, key, {'action': 'begin', 'filename': filename, 'revision': revision, 'expected': len(records), 'manifest_revision': manifest_revision or revision})
    if result.get('complete'): return
    batches, batch, size = [], [], 0
    for record in records:
        record_size = len(json.dumps(record, ensure_ascii=False).encode()) + 2
        if record_size > 900000: raise FeedError('Application exceeds upload limit')
        if batch and (len(batch) == 100 or size + record_size > 900000):
            batches.append(batch); batch, size = [], 0
        batch.append(record); size += record_size
    if batch: batches.append(batch)
    if len(batches) > 2000: raise FeedError('Too many batches')
    for number, batch in enumerate(batches):
        call(endpoint, key, {'action': 'batch', 'file_id': result['id'], 'number': number, 'records': batch})
    result = call(endpoint, key, {'action': 'complete', 'file_id': result['id']})
    if result.get('complete') is not True: raise FeedError('File completion not acknowledged')

def run(environment):
    with diagnostic('credentials'):
        odp_key = os.environ.get('ODP_API_KEY'); ingest_key = os.environ.get('WATCH_INGEST_KEY')
        if not odp_key or not ingest_key: raise FeedError('Required credentials unavailable')
        endpoint = ENDPOINTS[environment]
    today = dt.datetime.now(dt.timezone.utc).date()
    # USPTO's product lookup requires lowercase; returned download URLs use uppercase.
    with diagnostic('catalog-request'):
        payload = request(API + '/trtdxfap?fileDataFromDate=' + (today-dt.timedelta(days=35)).isoformat() + '&fileDataToDate=' + today.isoformat() + '&includeFiles=true', odp_key)
    with diagnostic('catalog-validation'):
        files = manifest(payload, today)
    with diagnostic('inventory-request'):
        inventory = request(endpoint, ingest_key, {'action': 'inventory'})
    with diagnostic('inventory-validation'):
        completed = {(f['filename'], f['manifest_revision']) for f in inventory['files']}
    # Replay window deliberately includes revised source files. Completed content hashes skip DB writes.
    with tempfile.TemporaryDirectory(prefix='vb-watch-') as folder:
        for item in files:
            filename = item['fileName']; path = os.path.join(folder, filename)
            with diagnostic('source-metadata', filename):
                marker = item.get('fileLastModifiedDateTime')
                if not isinstance(marker, str) or not marker: raise FeedError('Missing file revision metadata')
                manifest_revision = hashlib.sha256(json.dumps([filename, item['fileSize'], marker]).encode()).hexdigest()
            if (filename, manifest_revision) in completed: continue
            try:
                with diagnostic('archive-download', filename):
                    req = urllib.request.Request(item['fileDownloadURI'], headers={'X-API-KEY': odp_key})
                    size = 0; digest = hashlib.sha256()
                    with ARCHIVE_OPENER.open(req, timeout=120) as response, open(path, 'wb') as output:
                        while True:
                            chunk = response.read(65536)
                            if not chunk: break
                            size += len(chunk)
                            if size > MAX_ZIP: raise FeedError('Download limit exceeded')
                            digest.update(chunk); output.write(chunk)
                    if size != item['fileSize']: raise FeedError('Download size mismatch')
                with diagnostic('archive-validation', filename):
                    records, counts = extract(path, filename)
                with diagnostic('file-ingestion', filename):
                    ingest(endpoint, ingest_key, filename, digest.hexdigest(), records, manifest_revision=manifest_revision)
                print(filename, 'processed', len(records), 'word records;', counts['total'], 'total records')
            except FeedError: raise
            except Exception: raise FeedError('Source processing failed; coverage remains incomplete') from None
            finally:
                if os.path.exists(path): os.remove(path)
    with diagnostic('client-checks'):
        run_checks(endpoint, ingest_key)


def run_checks(endpoint, key, call=request):
    for _ in range(10):
        outcome = call(endpoint, key, {'action': 'run'})
        if not isinstance(outcome.get('pending'), bool): raise FeedError('Invalid queue acknowledgement')
        if outcome['pending'] is False: return
    raise FeedError('Client queue still pending; rerun required')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--environment', choices=ENDPOINTS, default='test')
    parser.add_argument('--sample'); args = parser.parse_args()
    try:
        if args.sample:
            with diagnostic('sample-validation', os.path.basename(args.sample)):
                records, counts = extract(args.sample, os.path.basename(args.sample))
            print(json.dumps({'counts': counts, 'word_candidates': len(records)}, sort_keys=True))
        else: run(args.environment)
    except Exception:
        # Never print exceptions which may include headers, signed URLs, or response bodies.
        print('Watch processing failed. No completed check is claimed.'); raise SystemExit(1)
