#!/usr/bin/env python3
"""
upsert-manifest-privileges.py

Reads every `zorbit-module-manifest.json` / `manifest.json` in
/Users/s/workspace/zorbit/02_repos/*, extracts every top-level
`privileges[]` entry, and upserts them into
`zorbit_authorization.privileges_v2` on the ARM UAT database.

- Runs on the local laptop and pipes SQL into the remote docker exec.
- `section_id` is derived from the module type / slug (mapped below).
- Unknown section -> falls back to SEC-PLAT (Platform catch-all).
- `ON CONFLICT (privilege_code) DO UPDATE SET label/updated_at`.
- Per J13 in JUDGEMENT-CALLS-log.md (2026-04-22 Soldier AO).

Notes:
- The description column doesn't exist on privileges_v2 v1 — only label.
  We collapse label ← privilege.label (or code if missing) and ignore
  the caller's `description` field for now.
- `id` is computed as `PRV-<8-char-hash>`, deterministic per privilege_code,
  so re-runs are idempotent when the constraint allows.
- Sequencing matters: we write SQL to a tmp file, scp it, then psql-run it
  so we don't fight quoting limits.

Usage: python3 upsert-manifest-privileges.py
"""

import glob
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

REPOS_ROOT = '/Users/s/workspace/zorbit/02_repos'
REMOTE_HOST = 'ilri-arm-uat'
REMOTE_CONTAINER = 'zs-pg'
REMOTE_DB = 'zorbit_authorization'
REMOTE_USER = 'zorbit'


# Map module slug -> section_id. Derived from the /privilege_sections table
# snapshot on 2026-04-22. Unknown slugs fall back to SEC-PLAT.
SLUG_TO_SECTION = {
    'zorbit-cor-identity': 'SEC-IDNT',
    'zorbit-identity': 'SEC-IDNT',
    'zorbit-cor-authorization': 'SEC-AUTH',
    'zorbit-authorization': 'SEC-AUTH',
    'zorbit-cor-navigation': 'SEC-NAVG',
    'zorbit-navigation': 'SEC-NAVG',
    'zorbit-cor-audit': 'SEC-AUDT',
    'zorbit-audit': 'SEC-AUDT',
    'zorbit-cor-event_bus': 'SEC-MSGN',
    'zorbit-event_bus': 'SEC-MSGN',
    'zorbit-cor-pii_vault': 'SEC-PIIV',
    'zorbit-pii-vault': 'SEC-PIIV',
    'zorbit-cor-secrets_vault': 'SEC-PLAT',
    'zorbit-cor-module_registry': 'SEC-PLAT',
    'zorbit-cor-deployment_registry': 'SEC-PLAT',
    'zorbit-cor-observability': 'SEC-PLAT',
    'zorbit-pfs-seeder': 'SEC-PLAT',
    'zorbit-pfs-ai_gateway': 'SEC-AIPR',
    'zorbit-pfs-chat': 'SEC-CHAT',
    'zorbit-pfs-datatable': 'SEC-DTBL',
    'zorbit-pfs-doc_generator': 'SEC-DCGN',
    'zorbit-pfs-file_storage': 'SEC-PLAT',
    'zorbit-pfs-file_viewer': 'SEC-PLAT',
    'zorbit-pfs-form_builder': 'SEC-FBLR',
    'zorbit-pfs-interaction_recorder': 'SEC-IREC',
    'zorbit-pfs-kyc': 'SEC-VRFY',
    'zorbit-pfs-rtc': 'SEC-RTCM',
    'zorbit-pfs-white_label': 'SEC-WLBL',
    'zorbit-pfs-workflow_engine': 'SEC-UWWF',
    'zorbit-pfs-zmb_factory': 'SEC-ZMBF',
    'zorbit-app-pcg4': 'SEC-PCG4',
    'zorbit-app-product_pricing': 'SEC-PRPR',
    'zorbit-app-hi_quotation': 'SEC-HIQT',
    'zorbit-app-hi_retail_quotation': 'SEC-HIQT',
    'zorbit-app-hi_sme_quotation': 'SEC-HIQT',
    'zorbit-app-hi_uw_decisioning': 'SEC-HIDC',
    'zorbit-app-uw_workflow': 'SEC-UWWF',
    'zorbit-ai-tele_uw': 'SEC-AIPR',
}


def short_id(prefix: str, code: str) -> str:
    h = hashlib.sha256(code.encode('utf-8')).hexdigest()[:8].upper()
    return f'{prefix}-{h}'


def extract_privileges(manifest_path: str):
    with open(manifest_path) as f:
        m = json.load(f)

    module_id = m.get('moduleId') or m.get('module', {}).get('name') or ''
    section_id = SLUG_TO_SECTION.get(module_id, 'SEC-PLAT')

    privs = m.get('privileges', [])
    rows = []
    for p in privs:
        if isinstance(p, str):
            # Legacy shape: privileges is a flat list of codes.
            code = p
            label = p
        elif isinstance(p, dict):
            code = p.get('code') or p.get('id') or p.get('privilege')
            if not code:
                continue
            label = p.get('label') or p.get('name') or code
        else:
            continue
        # Truncate to column widths. privilege_code varchar(200).
        if len(code) > 200:
            code = code[:200]
        if len(label) > 200:
            label = label[:200]
        rows.append({
            'id': short_id('PRV', code),
            'privilege_code': code,
            'privilege_label': label,
            'section_id': section_id,
            'module_id': module_id,
        })
    return rows


def main():
    manifests = sorted(glob.glob(f'{REPOS_ROOT}/*/zorbit-module-manifest.json')) + \
                sorted(glob.glob(f'{REPOS_ROOT}/*/manifest.json'))

    all_rows = []
    seen_codes = set()
    for mf in manifests:
        try:
            rows = extract_privileges(mf)
        except Exception as e:
            print(f'SKIP {mf}: {e}', file=sys.stderr)
            continue
        for r in rows:
            if r['privilege_code'] in seen_codes:
                continue
            seen_codes.add(r['privilege_code'])
            all_rows.append(r)

    print(f'[upsert-manifest-privileges] extracted {len(all_rows)} unique privileges from {len(manifests)} manifests', file=sys.stderr)

    if not all_rows:
        print('no privileges to upsert', file=sys.stderr)
        return 0

    # Build a single COPY-style SQL script.
    sql_lines = [
        '-- Auto-generated by upsert-manifest-privileges.py',
        '-- Do not hand-edit.',
        'BEGIN;',
    ]
    for r in all_rows:
        code = r['privilege_code'].replace("'", "''")
        label = r['privilege_label'].replace("'", "''")
        sql_lines.append(
            f"INSERT INTO privileges_v2 (id, privilege_code, privilege_label, section_id, visible_in_menu, seq_number) "
            f"VALUES ('{r['id']}', '{code}', '{label}', '{r['section_id']}', true, 0) "
            f"ON CONFLICT (privilege_code) DO UPDATE SET "
            f"privilege_label = EXCLUDED.privilege_label, "
            f"updated_at = now();"
        )
    sql_lines.append('COMMIT;')

    tmp_local = '/tmp/zorbit-priv-upsert.sql'
    with open(tmp_local, 'w') as f:
        f.write('\n'.join(sql_lines) + '\n')

    # Copy to remote and execute via docker exec
    remote_tmp = '/tmp/zorbit-priv-upsert.sql'
    scp = subprocess.run(
        ['scp', '-q', tmp_local, f'{REMOTE_HOST}:{remote_tmp}'],
        check=False,
    )
    if scp.returncode != 0:
        print(f'scp failed: {scp.returncode}', file=sys.stderr)
        return scp.returncode

    # Before count
    before = subprocess.run(
        ['ssh', REMOTE_HOST,
         f'docker exec -i {REMOTE_CONTAINER} psql -U {REMOTE_USER} -d {REMOTE_DB} -tA -c "SELECT COUNT(*) FROM privileges_v2;"'],
        capture_output=True, text=True,
    )
    before_n = before.stdout.strip()
    print(f'[before] privileges_v2 count: {before_n}', file=sys.stderr)

    # Copy the SQL file *into* the container and execute it.
    # (The remote /tmp isn't visible inside zs-pg by default.)
    subprocess.run(
        ['ssh', REMOTE_HOST,
         f'docker cp {remote_tmp} {REMOTE_CONTAINER}:/tmp/zorbit-priv-upsert.sql'],
        check=True,
    )
    run = subprocess.run(
        ['ssh', REMOTE_HOST,
         f'docker exec {REMOTE_CONTAINER} psql -U {REMOTE_USER} -d {REMOTE_DB} -v ON_ERROR_STOP=1 -f /tmp/zorbit-priv-upsert.sql'],
        capture_output=True, text=True,
    )
    print(run.stdout)
    print(run.stderr, file=sys.stderr)
    if run.returncode != 0:
        return run.returncode

    # After count
    after = subprocess.run(
        ['ssh', REMOTE_HOST,
         f'docker exec -i {REMOTE_CONTAINER} psql -U {REMOTE_USER} -d {REMOTE_DB} -tA -c "SELECT COUNT(*) FROM privileges_v2;"'],
        capture_output=True, text=True,
    )
    after_n = after.stdout.strip()
    print(f'[after]  privileges_v2 count: {after_n}', file=sys.stderr)
    print(f'[delta]  +{int(after_n) - int(before_n)}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
