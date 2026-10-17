"""Read-only ODP check: prompt privately, verify small/latest archives, never ingest."""
import datetime as dt
import getpass
import hashlib
import json
from pathlib import Path
import tempfile
import urllib.request
import urllib.error
import ssl

progress = {"stage": "key entry"}
import runner


def main():
    print('USPTO source check only. No client data or database changes.')
    key = getpass.getpass('Paste your USPTO ODP key (typing stays hidden), then press Return: ').strip()
    if not key:
        raise runner.FeedError('No key entered')
    progress['stage'] = 'file-list request'
    today = dt.datetime.now(dt.timezone.utc).date()
    url = runner.API + '/trtdxfap?fileDataFromDate=' + (today-dt.timedelta(days=35)).isoformat() + '&fileDataToDate=' + today.isoformat() + '&includeFiles=true'
    req = urllib.request.Request(url, headers={'X-API-KEY': key, 'Accept': 'application/json'})
    with runner.OPENER.open(req, timeout=120) as response:
        raw = response.read(8*1024*1024+1)
        if len(raw) > 8*1024*1024:
            raise runner.FeedError('Response limit exceeded')
        payload = json.loads(raw)
    progress['stage'] = 'file-list validation'
    files = runner.manifest(payload, today)
    selected = [min(files, key=lambda item: item['fileSize']), files[-1]]
    report = {'manifest_verified': True, 'available_files': len(files), 'archives': [], 'database_changes': False}
    seen = set()
    with tempfile.TemporaryDirectory(prefix='vb-watch-source-check-') as folder:
        for item in selected:
            name = item['fileName']
            if name in seen:
                continue
            seen.add(name)
            progress['stage'] = 'archive download: ' + name
            print('Checking', name, '—', item['fileSize'], 'bytes. Please wait.')
            path = Path(folder) / name
            req = urllib.request.Request(item['fileDownloadURI'], headers={'X-API-KEY': key})
            size = 0
            digest = hashlib.sha256()
            with runner.ARCHIVE_OPENER.open(req, timeout=120) as response, path.open('wb') as output:
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > runner.MAX_ZIP:
                        raise runner.FeedError('Archive limit exceeded')
                    digest.update(chunk)
                    output.write(chunk)
            if size != item['fileSize']:
                raise runner.FeedError('Archive size mismatch')
            progress['stage'] = 'archive validation: ' + name
            records, counts = runner.extract(str(path), name)
            report['archives'].append({'filename': name, 'bytes': size, 'sha256': digest.hexdigest(), 'counts': counts, 'word_candidates': len(records)})
            print('Verified', name, '—', len(records), 'word candidates.')
    return report


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    try:
        result = main()
    except Exception as error:
        # No exception details: credential-bearing request objects must never reach logs.
        result = {'manifest_verified': False, 'status': 'Source check failed; no import performed', 'database_changes': False}
        result['failed_stage'] = progress['stage']
        if isinstance(error, urllib.error.HTTPError):
            result['http_status'] = error.code
        elif isinstance(error, urllib.error.URLError):
            result['failure_type'] = 'certificate validation' if isinstance(error.reason, ssl.SSLCertVerificationError) else 'network connection'
        elif isinstance(error, runner.FeedError):
            result['failure_type'] = 'source validation'
            if str(error) in {'Unexpected redirect', 'Download limit exceeded', 'Archive size mismatch', 'Incomplete file manifest', 'Wrong USPTO product', 'No current source files'}:
                result['validation_detail'] = str(error)
        else:
            result['failure_type'] = type(error).__name__
        print('Source check failed at:', progress['stage'])
        print('Diagnostic:', result.get('validation_detail', result.get('http_status', result.get('failure_type'))))
        print('No import performed. Your key was not saved.')
    Path(args.report).write_text(json.dumps(result, indent=2) + '\n')
    print('Check finished. Tell Codex: source check finished. Your key was not saved.')
