"""Bounded, no-publish scholarship source health check and discovery preview."""
from __future__ import annotations
import json, os, sys
from pathlib import Path
from urllib.parse import urlsplit
from urllib import robotparser
import requests

ROOT = Path(__file__).parent
def safe(url: str) -> bool:
    host = urlsplit(url).hostname or ''
    return urlsplit(url).scheme == 'https' and host not in {'localhost'} and not host.startswith(('127.','10.','192.168.','169.254.'))
def run(dry_run: bool = True) -> dict[str, int]:
    if not dry_run: raise RuntimeError('İlk sürüm yalnızca dry-run destekler; otomatik yayın kapalıdır.')
    sources = json.loads((ROOT/'opportunity_sources.json').read_text(encoding='utf-8'))['sources']
    report = {'checked':len(sources),'reachable':0,'candidates':0,'duplicates':0,'needs_review':0,'rejected':0,'published':0,'writes':0}
    for source in sources:
        if not source.get('enabled') or not source.get('robots_allowed') or not safe(source['base_url']): report['rejected'] += 1; continue
        robots = requests.get(f"https://{urlsplit(source['base_url']).hostname}/robots.txt", timeout=10, headers={'User-Agent':'StajimVarScholarshipPreview/1.0'})
        if robots.status_code == 200:
            rules = robotparser.RobotFileParser(); rules.parse(robots.text.splitlines())
            if not rules.can_fetch('StajimVarScholarshipPreview', source['base_url']): report['rejected'] += 1; continue
        response = requests.get(source['base_url'], timeout=15, headers={'User-Agent':'StajimVarScholarshipPreview/1.0'})
        if response.ok: report['reachable'] += 1
        else: report['rejected'] += 1
    return report
if __name__ == '__main__':
    try: print(json.dumps(run(dry_run=os.getenv('SCHOLARSHIP_DRY_RUN','true').lower()=='true'), ensure_ascii=False))
    except Exception as error: print(json.dumps({'error':str(error)}, ensure_ascii=False)); sys.exit(1)
