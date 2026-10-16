"""Manual Test-only import, with private interactive credentials and no schedules."""
import argparse
import datetime as dt
import getpass
import hashlib
import importlib
import json
from pathlib import Path
import tempfile
import urllib.error
import urllib.request
import runner


def main(report, save):
    print('Venture Branding TEST import. Production is not a possible destination.')
    odp_key = getpass.getpass('Paste USPTO-issued ODP key (hidden), then Return: ').strip()
    watch_key = getpass.getpass('Paste your made-up WATCH_INGEST_KEY (hidden), then Return: ').strip()
    if not odp_key or not 32 <= len(watch_key) <= 256:
        raise runner.FeedError('Missing or unsupported credential length')
    endpoint = runner.ENDPOINTS['test']
    today = dt.datetime.now(dt.timezone.utc).date()
    report['stage'] = 'file-list request'; save()
    payload = runner.request(runner.API + '/trtdxfap?fileDataFromDate=' + (today-dt.timedelta(days=35)).isoformat() + '&fileDataToDate=' + today.isoformat() + '&includeFiles=true', odp_key)
    files = runner.manifest(payload, today)
    ending = runner.file_date(files[-1]['fileName'])
    files = [f for f in files if ending-dt.timedelta(days=6) <= runner.file_date(f['fileName']) <= ending]
    expected = {ending-dt.timedelta(days=n) for n in range(7)}
    if {runner.file_date(f['fileName']) for f in files} != expected or ending < today-dt.timedelta(days=2):
        raise runner.FeedError('Seven current consecutive source dates unavailable')
    report.update(coverage_from=(ending-dt.timedelta(days=6)).isoformat(), coverage_to=ending.isoformat(), stage='Test inventory'); save()
    inventory = runner.request(endpoint, watch_key, {'action': 'inventory'})
    completed = {(f['filename'], f['manifest_revision']) for f in inventory['files']}
    folder = Path(__file__).resolve().parents[2] / 'work' / 'watch-public-archives'
    folder.mkdir(parents=True, exist_ok=True)
    # Cache public archives only, so validation fixes never require re-downloading them.
    for item in files:
        name = item['fileName']
        marker = item.get('fileLastModifiedDateTime')
        if not isinstance(marker, str) or not marker:
            raise runner.FeedError('Missing revision metadata')
        revision = hashlib.sha256(json.dumps([name, item['fileSize'], marker]).encode()).hexdigest()
        if (name, revision) in completed:
            print(name, 'already imported; skipped.')
            report['files'].append({'filename': name, 'already_complete': True}); save()
            continue
        report['stage'] = 'download ' + name; save()
        print('Downloading', name, '—', item['fileSize'], 'bytes.')
        path = Path(folder) / name
        def archive_hash():
            h = hashlib.sha256()
            with path.open('rb') as cached:
                for chunk in iter(lambda: cached.read(65536), b''):
                    h.update(chunk)
            return h
        if path.exists() and path.stat().st_size == item['fileSize']:
            digest = archive_hash()
            print('Using cached public archive:', name)
        else:
            req = urllib.request.Request(item['fileDownloadURI'], headers={'X-API-KEY': odp_key})
            size = 0; digest = hashlib.sha256()
            with runner.ARCHIVE_OPENER.open(req, timeout=120) as response, path.open('wb') as output:
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > runner.MAX_ZIP:
                        raise runner.FeedError('Download limit exceeded')
                    output.write(chunk); digest.update(chunk)
            if size != item['fileSize']:
                path.unlink()
                raise runner.FeedError('Archive size mismatch')
        while True:
            report['stage'] = 'validate ' + name; save()
            try:
                records, counts = runner.extract(str(path), name)
                report.pop('validation_detail', None)
                break
            except runner.FeedError as error:
                # FeedError messages in runner are fixed diagnostic text, never request data.
                report.update(status='paused', validation_detail=str(error)); save()
                print('Validation paused:', str(error))
                print('Public file retained for Codex to inspect. No upload of this file occurred.')
                input('Tell Codex: importer paused. Leave this window open. Press Return only after the fix: ')
                importlib.reload(runner)
                report['status'] = 'running'
        report['stage'] = 'Test upload ' + name; save()
        runner.ingest(endpoint, watch_key, name, digest.hexdigest(), records, manifest_revision=revision)
        entry = {'filename': name, 'complete': True, 'word_candidates': len(records), 'total_records': counts['total'], 'source_counts': counts}
        report['files'].append(entry); save()
        print('Imported into TEST:', name, '—', len(records), 'word candidates.')
    report.update(stage='finished', status='success'); save()
    print('TEST IMPORT SUCCEEDED. Tell Codex: Test import finished.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--report', required=True); args = parser.parse_args()
    report = {'status': 'running', 'environment': 'test', 'stage': 'credential entry', 'files': []}
    def save():
        Path(args.report).write_text(json.dumps(report, indent=2)+'\n')
    try:
        main(report, save)
    except Exception as error:
        report['status'] = 'stopped'
        report['failure_type'] = 'HTTP '+str(error.code) if isinstance(error, urllib.error.HTTPError) else type(error).__name__
        if isinstance(error, runner.FeedError):
            report['validation_detail'] = str(error)
        save()
        print('Import stopped at:', report['stage'], '—', report['failure_type'])
        print('Tell Codex: Test import stopped. Completed files remain safely recorded in Test.')
    print('Keys were not saved. No Production changes or schedules were made.')
