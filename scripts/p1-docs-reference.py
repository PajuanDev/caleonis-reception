"""Materialize every advertised API operation/event from Caléonis OpenAPI.

Generated pages carry the real operation, fields, status codes, full schemas and
permissions. No live requests or provider side effects are performed.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'mintlify'
spec_path = DOCS / 'api-reference/openapi.json'
spec = json.loads(spec_path.read_text(encoding='utf-8'))
schema_hash = hashlib.sha256(spec_path.read_bytes()).hexdigest()

FR_TITLES = {
    'getMe': 'Vérifier une clé API', 'getBusiness': "Lire l'entreprise", 'updateBusiness': "Modifier l'entreprise",
    'listServices': 'Lister les services', 'listStaff': 'Lister les intervenants', 'listCalls': 'Lister les appels',
    'getCall': 'Lire un appel', 'listContacts': 'Lister les contacts', 'createContact': 'Créer un contact',
    'getContact': 'Lire un contact', 'updateContact': 'Modifier un contact', 'listAppointments': 'Lister les rendez-vous',
    'createAppointment': 'Réserver un rendez-vous', 'getAvailability': 'Lister les créneaux disponibles',
    'getAppointment': 'Lire un rendez-vous', 'cancelAppointment': 'Annuler un rendez-vous',
    'rescheduleAppointment': 'Déplacer un rendez-vous', 'listMessages': 'Lister les messages de suivi',
    'createKnowledgeEntry': 'Ajouter une connaissance', 'listWebhooks': 'Lister les destinations webhook',
    'createWebhook': 'Créer une destination webhook', 'getWebhook': 'Lire une destination webhook',
    'updateWebhook': 'Modifier une destination webhook', 'deleteWebhook': 'Supprimer une destination webhook',
    'testWebhook': 'Envoyer un événement de test',
}


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def resolve(schema):
    if '$ref' not in schema:
        return schema
    target = spec
    for part in schema['$ref'].removeprefix('#/').split('/'):
        target = target[part]
    return {**target, **{k: v for k, v in schema.items() if k != '$ref'}}


def relevant_definitions(value, found=None):
    found = {} if found is None else found
    if isinstance(value, list):
        for entry in value:
            relevant_definitions(entry, found)
    elif isinstance(value, dict):
        if '$ref' in value:
            name = value['$ref'].split('/')[-1]
            if name not in found:
                definition = resolve({'$ref': value['$ref']})
                found[name] = definition
                relevant_definitions(definition, found)
        for key, entry in value.items():
            if key != '$ref':
                relevant_definitions(entry, found)
    return found


def cell(value):
    return str(value).replace('|', '&#124;').replace('\n', ' ').replace('<', '&lt;').replace('>', '&gt;')


def type_label(schema):
    schema = resolve(schema)
    if 'oneOf' in schema or 'anyOf' in schema:
        return ' / '.join(type_label(x) for x in schema.get('oneOf', schema.get('anyOf', [])))
    kind = schema.get('type', 'object')
    kind = ' / '.join(kind) if isinstance(kind, list) else kind
    if kind == 'array':
        kind = 'array<' + type_label(schema.get('items', {})) + '>'
    if schema.get('format'):
        kind += ' (' + schema['format'] + ')'
    return kind


def schema_rows(schema, language, prefix='', depth=0):
    schema = resolve(schema)
    result = []
    for name, value in schema.get('properties', {}).items():
        field = prefix + name
        detail = resolve(value)
        required = name in schema.get('required', [])
        constraints = []
        for key in ['enum', 'default', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems']:
            if key in detail:
                constraints.append(key + '=' + json.dumps(detail[key], ensure_ascii=False))
        description = detail.get('description', '')
        if constraints:
            description += ' ' + '; '.join(constraints)
        result.append('| `' + cell(field) + '` | ' + cell(type_label(value)) + ' | ' + ('Oui' if required and language == 'fr' else 'Non' if language == 'fr' else 'Yes' if required else 'No') + ' | ' + cell(description) + ' |')
        if depth < 8:
            nested = resolve(detail.get('items', {})) if detail.get('type') == 'array' else detail
            if nested.get('properties'):
                result.extend(schema_rows(nested, language, field + ('[].' if detail.get('type') == 'array' else '.'), depth + 1))
    return result


def put(slug, title, description, body):
    path = DOCS / (slug + '.mdx')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('---\ntitle: ' + json.dumps(title, ensure_ascii=False) + '\ndescription: ' + json.dumps(description, ensure_ascii=False) + '\n---\n\n' + body.strip() + '\n', encoding='utf-8')


records = []
api_groups = {'fr': {}, 'en': {}}
for path, methods in spec['paths'].items():
    for method, operation in methods.items():
        tag = operation.get('tags', ['API'])[0]
        slug = 'api-reference/' + slugify(tag) + '/' + slugify(operation['summary'])
        scope = operation.get('x-required-scope')
        for language in ['fr', 'en']:
            french = language == 'fr'
            prefix = '' if french else 'en/'
            title = FR_TITLES[operation['operationId']] if french else operation['summary']
            body = [f'`{method.upper()} https://receptionist.caleonis.com/api/v1{path}`']
            body += ['\n' + ('Cette fiche décrit le contrat du runtime Caléonis. Les identifiants, champs et descriptions techniques du schéma sont conservés pour éviter toute ambiguïté.' if french else 'This page describes the Caléonis runtime contract. Schema field names and technical descriptions are preserved verbatim for integration accuracy.')]
            if operation.get('description'):
                body += ['\n' + operation['description']]
            body += ['\n## ' + ('Authentification et permissions' if french else 'Authentication and permissions')]
            body += [('Envoyez `Authorization: Bearer <clé API>`. ' if french else 'Send `Authorization: Bearer <API key>`. ') + (('Permission exigée : ' if french else 'Required scope: ') + f'`{scope}`.' if scope else ('Toute clé valide peut vérifier sa connexion avec cette opération.' if french else 'Any valid key can check its connection with this operation.'))]
            if method != 'get':
                body += ['\n<Warning>' + ('Cette opération produit un effet réel. Utilisez une entreprise de test autorisée ; aucun appel ne doit être exécuté pour simplement lire la référence.' if french else 'This operation has a real effect. Use an authorized test business; reading the reference does not call the operation.') + '</Warning>']
            if 'appointment' in operation['operationId'].lower() or operation['operationId'] == 'getAvailability':
                body += ['\n' + ('Respectez mode de réservation, horaires, disponibilité, fuseau et permissions. Un résultat applicatif ne prouve pas la synchronisation Google ni une notification. La ligne française Voice-only ne peut pas envoyer de SMS.' if french else 'Respect booking mode, hours, availability, time zone and permissions. An application result does not prove Google synchronization or a notification. The French Voice-only line cannot send SMS.')]
            if path == '/messages':
                body += ['\n' + ('Ces messages sont les demandes de suivi prises pour l’équipe, pas une API d’envoi SMS.' if french else 'These are team follow-up messages, not an SMS sending API.')]
            parameters = [resolve(x) for x in operation.get('parameters', [])]
            body += ['\n## ' + ('Paramètres' if french else 'Parameters')]
            if parameters:
                body += ['| ' + ('Champ | Emplacement | Type | Requis | Description' if french else 'Field | Location | Type | Required | Description') + ' |', '| --- | --- | --- | --- | --- |']
                for p in parameters:
                    body += ['| `' + p['name'] + '` | ' + p['in'] + ' | ' + cell(type_label(p.get('schema', {}))) + ' | ' + ('Oui' if french and p.get('required') else 'Non' if french else 'Yes' if p.get('required') else 'No') + ' | ' + cell(p.get('description', '')) + ' |']
            else:
                body += ['Aucun paramètre de chemin ou de requête.' if french else 'No path or query parameters.']
            request = resolve(operation.get('requestBody', {}))
            if request:
                body += ['\n## ' + ('Corps de la requête' if french else 'Request body')]
                for mime, item in request.get('content', {}).items():
                    body += ['\n`Content-Type: ' + mime + '`', '\n| ' + ('Champ | Type | Requis | Description / contraintes' if french else 'Field | Type | Required | Description / constraints') + ' |', '| --- | --- | --- | --- |']
                    rows = schema_rows(item.get('schema', {}), language)
                    body += rows or ['| — | ' + cell(type_label(item.get('schema', {}))) + ' | — | ' + ('Voir le schéma complet ci-dessous.' if french else 'See the full schema below.') + ' |']
            body += ['\n## ' + ('Réponses' if french else 'Responses'), '| HTTP | Description |', '| --- | --- |']
            for status, response in operation.get('responses', {}).items():
                response = resolve(response)
                body += ['| `' + status + '` | ' + cell(response.get('description', '')) + ' |']
            body += ['\n' + ('Les réponses d’erreur utilisent `error.code`, `error.message` et parfois `error.details`. Respectez `Retry-After` et conservez la même clé d’idempotence et le même corps pour reprendre une création prise en charge.' if french else 'Errors use error.code, error.message and sometimes error.details. Respect Retry-After and reuse the same idempotency key and body when retrying a supported creation.')]
            body += ['\n## ' + ('Exemple HTTP' if french else 'HTTP example'), '\n```http', f'{method.upper()} /api/v1{path} HTTP/1.1', 'Host: receptionist.caleonis.com', 'Authorization: Bearer <' + ('clé conservée côté serveur' if french else 'server-side key') + '>']
            if request:
                body += ['Content-Type: application/json']
            body += ['```']
            definitions = relevant_definitions(operation)
            body += ['\n## ' + ('Contrat et schémas complets' if french else 'Full contract and schemas'), '\n' + ('Le bloc conserve tous les champs, unions, formats, contraintes et réponses de cette opération. Les `$ref` se résolvent dans `components.schemas` fourni dans le même bloc.' if french else 'The block retains all fields, unions, formats, constraints and responses for this operation. Each $ref resolves in components.schemas included in the same block.'), '\n```json', json.dumps({'method': method.upper(), 'path': '/api/v1' + path, 'operation': operation, 'components': {'schemas': definitions}}, ensure_ascii=False, indent=2), '```']
            body += ['\n' + ('Télécharger le [document OpenAPI complet](/api-reference/openapi.json). Voir [Authentification](/api/authentication), [Requêtes et erreurs](/api/requests) et [Webhooks](/api/webhooks).' if french else 'Download the [complete OpenAPI document](/api-reference/openapi.json). See [Authentication](/en/api/authentication), [Requests and errors](/en/api/requests) and [Webhooks](/en/api/webhooks).')]
            put(prefix + slug, title, method.upper() + ' /api/v1' + path + (' : paramètres, permissions et schémas complets.' if french else ': parameters, permissions and full schemas.'), '\n'.join(body))
            api_groups[language].setdefault(tag, []).append(prefix + slug)
        records.append({'kind': 'operation', 'slug': slug, 'operationId': operation['operationId'], 'method': method.upper(), 'path': path, 'scope': scope})

for event, entry in spec.get('webhooks', {}).items():
    slug = 'api-reference/' + event.replace('.', '')
    operation = entry['post']
    definitions = relevant_definitions(operation)
    for language in ['fr', 'en']:
        french = language == 'fr'
        prefix = '' if french else 'en/'
        title = ('Événement ' if french else 'Event ') + event
        body = ['`' + event + '`', '\n' + ('Ce webhook envoie un POST signé vers une destination publique HTTPS autorisée. Cette fiche documente le contrat réel de l’événement ; lire la page ne crée aucun abonnement.' if french else 'This webhook sends a signed POST to an authorized public HTTPS endpoint. This page documents the actual event contract; reading it creates no subscription.'), '\n## ' + ('En-têtes et vérification' if french else 'Headers and verification'), '| ' + ('En-tête | Requis | Description' if french else 'Header | Required | Description') + ' |', '| --- | --- | --- |']
        for param in operation.get('parameters', []):
            body += ['| `' + param['name'] + '` | ' + ('Oui' if french else 'Yes') + ' | ' + cell(param.get('description', '')) + ' |']
        body += ['\n' + ('Vérifiez la signature sur le corps brut avec Standard Webhooks et refusez un horodatage trop ancien. Dédupliquez durablement `id` avant de produire un effet. Les événements peuvent être relivrés ou arriver dans un ordre différent.' if french else 'Verify the raw-body signature with Standard Webhooks and reject stale timestamps. Durably deduplicate id before producing effects. Events can be redelivered or arrive out of order.'), '\n## ' + ('Charge utile' if french else 'Payload')]
        for content in operation.get('requestBody', {}).get('content', {}).values():
            body += ['| ' + ('Champ | Type | Requis | Description / contraintes' if french else 'Field | Type | Required | Description / constraints') + ' |', '| --- | --- | --- | --- |']
            body += schema_rows(content.get('schema', {}), language)
        body += ['\n## ' + ('Contrat et schémas complets' if french else 'Full contract and schemas'), '\n```json', json.dumps({'event': event, 'operation': operation, 'components': {'schemas': definitions}}, ensure_ascii=False, indent=2), '```', '\n## ' + ('Accusé de réception et reprises' if french else 'Acknowledgement and retries'), '\n' + ('Acceptez durablement puis répondez 2xx sous 10 secondes. Les échecs sont repris selon le calendrier de la version déployée. Un événement de réservation ne prouve ni synchronisation externe ni SMS/email livré. Voir le [guide complet des webhooks](/api/webhooks) et le [schéma OpenAPI](/api-reference/openapi.json).' if french else 'Accept durably, then return 2xx within 10 seconds. Failed attempts follow the deployed retry schedule. A booking event does not prove external synchronization or delivered SMS/email. See the [complete webhook guide](/en/api/webhooks) and [OpenAPI schema](/api-reference/openapi.json).')]
        put(prefix + slug, title, ('Signature, charge utile et schéma complet pour ' if french else 'Signature, payload and full schema for ') + event + '.', '\n'.join(body))
        api_groups[language].setdefault('Events', []).append(prefix + slug)
    records.append({'kind': 'event', 'slug': slug, 'event': event})

# Preserve the inherited navigation hierarchy and add the full matching English
# hierarchy. Every MDX page is explicitly navigable, including generated API pages.
config_path = DOCS / 'docs.json'
config = json.loads(config_path.read_text(encoding='utf-8'))
native = json.loads((ROOT / '.tmp/lobbystack-public-upstream/mintlify/docs.json').read_text(encoding='utf-8'))


def localize_entry(value, language):
    if isinstance(value, str):
        base = value.removeprefix('fr/')
        return base if language == 'fr' else 'en/' + base
    if isinstance(value, list):
        return [localize_entry(x, language) for x in value]
    if isinstance(value, dict):
        return {key: localize_entry(entry, language) if key == 'pages' else entry for key, entry in value.items()}
    return value


localized_groups = {}
for language in ['fr', 'en']:
    groups = []
    source_groups = next(entry['groups'] for entry in native['navigation']['languages'] if entry['language'] == language)
    for group in source_groups:
        if group.get('openapi'):
            groups.append({'group': group['group'], 'pages': [{'group': ('Événements' if tag == 'Events' and language == 'fr' else tag), 'pages': pages} for tag, pages in api_groups[language].items()]})
        else:
            groups.append(localize_entry(group, language))
    prefix = '' if language == 'fr' else 'en/'
    support = ['support/availability', 'support/faq', 'support/troubleshooting', 'support/phone-forwarding', 'support/recordings', 'support/privacy', 'attributions']
    if language == 'en':
        support.append('overview')
    groups.append({'group': 'Aide et confiance' if language == 'fr' else 'Help and trust', 'pages': [prefix + slug for slug in support]})
    localized_groups[language] = groups
french_groups, english_groups = localized_groups['fr'], localized_groups['en']
config['navigation'] = {'languages': [{'language': 'fr', 'default': True, 'groups': french_groups}, {'language': 'en', 'groups': english_groups}]}
config['navbar'] = {'links': [{'label': 'Caléonis Receptionist', 'href': 'https://receptionist.caleonis.com/'}, {'label': 'Connexion', 'href': 'https://receptionist.caleonis.com/login'}], 'primary': {'type': 'button', 'label': 'Demander un essai', 'name': 'Demander un essai', 'href': 'https://receptionist.caleonis.com/signup'}}
config['description'] = 'Documentation complète FR/EN : accueil, appels, messages, connaissances, agenda, API, MCP et installation indépendante.'
config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

images = DOCS / 'images/screenshots'
images.mkdir(parents=True, exist_ok=True)
for source_name, target_name in [('messages-voice-only-fr-desktop.png', 'caleonis-messages-desktop.png'), ('messages-voice-only-fr-mobile.png', 'caleonis-messages-mobile.png')]:
    shutil.copyfile(ROOT / 'apps/landing/public/screenshots' / source_name, images / target_name)

(ROOT / 'docs/p1').mkdir(parents=True, exist_ok=True)
(ROOT / 'docs/p1/docs-api-reference.json').write_text(json.dumps({'source': 'mintlify/api-reference/openapi.json', 'sha256': schema_hash, 'operations': 25, 'events': 7, 'pagesPerLocale': len(records), 'records': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Materialized {len(records)} complete API operation/event pages per locale; navigation and authentic Messages assets updated.')
