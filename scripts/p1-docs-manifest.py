"""Write the auditable source-to-candidate documentation manifest (no network)."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'mintlify'
NATIVE = ROOT / '.tmp/lobbystack-public-upstream/mintlify'
EXPORT = ROOT / '.tmp/v1-preview/aide'
public = json.loads((ROOT / 'docs/p1/public-source-inventory.json').read_text(encoding='utf-8'))
export = json.loads((EXPORT / 'export-manifest.json').read_text(encoding='utf-8'))
rendered = {page['slug']: page for page in export['pages']}
sha = lambda content: hashlib.sha256(content).hexdigest()
exceptions = {
    'introduction': ['Brand, French pilot availability and honest commercial scope replace unqualified upstream promises.'],
    'quickstart': ['Public signup, included number and checkout promises replaced by authorized pilot onboarding; no live charge or number purchase.'],
    'getting-started/account-setup': ['Signup availability and email delivery are conditional; account operations describe controls actually offered.'],
    'getting-started/claim-your-number': ['French legal subscriber and Voice-only eligibility differ from upstream US/Canada self-service, free-plan release and porting claims.'],
    'getting-started/number-countries': ['The upstream international number catalogue is not an approved Caléonis offer.'],
    'agent/ai-settings/overview': ['Manual business summary is restored in the new candidate UI; automatic summary generation/rewrite, opening-hours extraction/new UI and six additional fallback locales are not implemented.'],
    'agent/ai-settings/appointment-changes': ['Cancellation/rescheduling need separate qualification; SMS-code verification cannot rely on the Voice-only line.'],
    'agent/knowledge': ['Public upstream plan/storage quotas are not approved Caléonis quotas.'],
    'agent/rules': ['Transfer templates apply only after PSTN transfer qualification; fallback is a human follow-up task.'],
    'dashboard/home': ['Upstream branded Home screenshot is not presented as Caléonis; authentic sanitized candidate captures remain pending CI.'],
    'dashboard/calls': ['Upstream branded Calls screenshot is not presented as Caléonis; authentic sanitized candidate captures remain pending CI.'],
    'dashboard/messages': ['Two authentic candidate screenshots with fictitious data replace the upstream branded image; EN explicitly labels their French UI. Voice-only disables SMS.'],
    'dashboard/analytics': ['Upstream branded Analytics screenshot is not presented as Caléonis; authentic sanitized candidate captures remain pending CI.'],
    'integrations/google-calendar': ['A test booking is qualified; Google Testing/renewal durability is a separate outstanding check.'],
    'integrations/sms': ['French Voice-only has no SMS; US/Canada toll-free terms and disclosures are not copied as French legal terms.'],
    'billing/plans': ['Requested equal numeric EUR catalogue remains draft pending tax, costs, legal-number eligibility and real provider currency approval. No charges enabled.'],
    'billing/usage': ['Upstream allowances/overage tariffs are not Caléonis commercial commitments; unknown supplier costs are not zero.'],
    'billing/affiliate-program': ['No approved Caléonis affiliate terms, rates, referral enrollment or payout program.'],
    'api/authentication': ['Caléonis runtime requires webhooks:manage; latest upstream event-specific subscription scopes are not claimed active.'],
    'api/requests': ['Caléonis createWebhook is idempotent:true; latest upstream prose saying POST /webhooks ignores Idempotency-Key is not copied.'],
    'api/webhooks': ['Payloads/signatures/retries retained, but event-specific management scopes and notification delivery claims follow the actual Caléonis runtime.'],
    'ai/connect-chatgpt': ['MCP/Responses/Codex snippets retained; third-party plan/menu promises replaced by installed-client checks and official OpenAI links.'],
}
records = []
for source in public['pages']:
    if not source['url'].startswith('https://docs.lobbystack.com/'):
        continue
    path = urlparse(source['url']).path.strip('/')
    language = 'fr' if path.startswith('fr/') else 'en'
    base = path.removeprefix('fr/')
    slug = base if language == 'fr' else 'en/' + base
    file = DOCS / (slug + '.mdx')
    html = EXPORT / slug / 'index.html'
    page = rendered.get(slug)
    assert file.is_file() and html.is_file() and page, 'Missing source route: ' + source['url']
    raw = file.read_bytes()
    row = {
        'sourceRoute': source['url'], 'sourceHttpStatus': source['status'],
        'sourceHtmlSha256': source['sha256'], 'candidateRoute': '/aide/' + slug + '/',
        'candidateFile': file.relative_to(ROOT).as_posix(), 'candidateSourceSha256': sha(raw),
        'candidateHtmlSha256': sha(html.read_bytes()), 'buildStatus': 'RENDERED',
        'httpStatus': None, 'httpEvidence': 'Covered by the root full-site HTTP contract; this offline manifest does not invent an HTTP result.',
        'assets': page['assets'], 'headings': page['headings'],
        'actions': re.findall(r'(?:href=["\']|\]\()(https?://[^"\'\s)]+)', raw.decode('utf-8')),
        'sourceDesktopCapture': 'Root Work browser audit: .tmp/p1-reprise/browser/captures.json',
        'candidateDesktopMobileCapture': 'Root Work browser audit, plus .tmp/p1-reprise/docs-browser/result.json',
        'exceptions': exceptions.get(base, []),
        'visualStatus': 'PENDING full Work page-by-page visual qualification; rendered coverage is not visual/functional parity.',
    }
    if base.startswith('api-reference/'):
        row['exceptions'].append('Reference is materialized from Caléonis OpenAPI, with all referenced schemas. The isolated static preview has no live API Try It panel.')
    records.append(row)

assets = []
for path in sorted((DOCS / 'images').rglob('*')):
    if not path.is_file():
        continue
    relative = path.relative_to(DOCS).as_posix()
    upstream = NATIVE / relative
    assets.append({'file': 'mintlify/' + relative, 'sha256': sha(path.read_bytes()), 'bytes': path.stat().st_size, 'upstreamSha256': sha(upstream.read_bytes()) if upstream.is_file() else None, 'exported': (EXPORT / relative).is_file(), 'licence': 'MIT associated documentation for inherited screenshots; candidate screenshots created by the operator workflow.', 'reason': 'Authentic candidate Messages view with fictitious data.' if 'caleonis-' in path.name else 'Historical LobbyStack-branded screenshot retained for provenance, not used as a Caléonis product screenshot.'})

base_files = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', 'e8e23bae4955f64fa3f99cb525faad908439077e', 'mintlify'], cwd=ROOT).decode().splitlines()
native_en = [path for path in NATIVE.rglob('*.mdx') if path.relative_to(NATIVE).parts[0] not in ['fr', 'es']]
native_fr = list((NATIVE / 'fr').rglob('*.mdx'))
result = {
    'scope': 'Exhaustive publicly advertised FR/EN documentation routes; Spanish excluded by requested locale scope.',
    'sourceBase': {'commit': 'e8e23bae4955f64fa3f99cb525faad908439077e', 'mdxGuides': len([x for x in base_files if x.endswith('.mdx')]), 'additionalSkillMarkdown': 'mintlify/ai/lobbystack-skill.md'},
    'sourceCurrent': {'repository': 'https://gitlab.com/lobbystack-group/lobbystack', 'commit': '46b217807cb251a6679a5e64b8142d2441ccecd3', 'licence': 'MIT, Copyright (c) 2026 LobbyStack contributors', 'nativeEnglishMdx': len(native_en), 'nativeFrenchMdx': len(native_fr)},
    'publicRouteCoverage': {'source': len(records), 'rendered': len(records), 'missing': 0, 'percent': 100, 'note': 'Route coverage only; exceptions and qualification remain explicit.'},
    'candidate': {'frenchPages': export['frenchPages'], 'englishPages': export['englishPages'], 'frenchGuides': export['frenchPages'] - 32, 'englishGuides': export['englishPages'] - 32, 'operationReferencesPerLocale': 25, 'webhookEventReferencesPerLocale': 7, 'englishCompatibilityAlias': '/aide/en/overview/'},
    'assets': assets, 'routes': records,
    'renderingExceptions': ['Mintlify remains the canonical source/configuration; preview is provider-free static rendering.', 'Almond layout, Geist font, hierarchical sidebar, full-text search, native heading ids, tabs, code copying, theme and mobile menu are implemented locally.', 'Geist font package is OFL; Lucide icon package is ISC; their local notices are retained.', 'No live API Try It execution, Mintlify cloud AI search or analytics backend is impersonated.', 'Production routing, DNS, prices, charges, customer data and PSTN chain are unchanged by the documentation export.'],
}
(ROOT / 'docs/p1/docs-parity.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'sourceRoutes': len(records), 'rendered': len(records), 'missing': 0, 'frenchPages': export['frenchPages'], 'englishPages': export['englishPages'], 'assetRecords': len(assets)}, indent=2))
