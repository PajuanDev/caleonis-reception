"""One private backup-health probe; durable recipient outbox; stdlib only."""
import argparse
import contextlib
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import stat
import tempfile
import urllib.error
import urllib.request

HEALTH_URL = 'http://worker.railway.internal:3002/health/backup'
EMAIL_URL = 'https://api.resend.com/emails'
CONTACT = 'contact@caleonis.com'
# The public repository contains no pilot owner's personal email address.
# A non-secret deployment setting supplies the already authorized owner.
RECIPIENTS = (CONTACT, os.environ.get('BACKUP_MONITOR_OWNER_EMAIL', 'owner@example.invalid').lower())
SENDER = 'Caléonis <contact@caleonis.com>'
SCHEMA = 'caleonis-backup-cloud-monitor-v1'
STREAM = 'worker-backup-private-v1'
MAX_AGE = 26 * 3600
RETRY_WINDOW = 23 * 3600
MAX_STATE = 1024 * 1024
MAX_ORPHANS = 24
ORPHAN_RETENTION_SECONDS = 24 * 3600
MAX_RESPONSE = 16384
UUID = re.compile(r'[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}', re.I)
HEX = re.compile(r'[a-f0-9]{64}')
CODE = re.compile(r'[A-Z][A-Z0-9_]{1,80}')


class MonitorError(Exception):
    pass


def now():
    return datetime.now(timezone.utc)


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('timestamp required')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('timezone required')
    return parsed.astimezone(timezone.utc)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def unavailable(code, observed):
    return {'status': 'monitor_unavailable', 'issue': code, 'observedAtUtc': observed.isoformat(), 'lastSuccessAtUtc': None, 'ageSeconds': None, 'failureCode': None, 'fingerprint': digest({'status': 'monitor_unavailable', 'issue': code})}


def classify(http_status, body, observed):
    """Validate SHA611 backupHealth.ts, not just a truthy `ok` field."""
    try:
        required = {'ok', 'status', 'enabled', 'running', 'lastSuccessAt', 'ageSeconds', 'lastCheckedAt', 'failureCode'}
        if not isinstance(body, dict) or set(body) != required:
            raise ValueError('contract')
        if type(body['ok']) is not bool or type(body['enabled']) is not bool or type(body['running']) is not bool:
            raise ValueError('flags')
        failure = body['failureCode']
        if failure is not None and (not isinstance(failure, str) or not CODE.fullmatch(failure)):
            raise ValueError('failure code')
        success = timestamp(body['lastSuccessAt']) if body['lastSuccessAt'] is not None else None
        checked = timestamp(body['lastCheckedAt']) if body['lastCheckedAt'] is not None else None
        if (success and (success - observed).total_seconds() > 60) or (checked and (checked - observed).total_seconds() > 60):
            raise ValueError('future time')
        age = body['ageSeconds']
        if success is None:
            if age is not None:
                raise ValueError('age without success')
        elif type(age) is not int or age < 0 or abs(max(0, int((observed-success).total_seconds())) - age) > 90:
            raise ValueError('inconsistent age')
        expected_ok = body['enabled'] and age is not None and age <= MAX_AGE and not failure
        expected_status = 'disabled' if not body['enabled'] else 'failed' if failure else 'never_succeeded' if age is None else 'fresh' if expected_ok else 'stale'
        if body['ok'] != expected_ok or body['status'] != expected_status or http_status != (200 if expected_ok else 503):
            raise ValueError('contradictory response')
        issue = {'fresh': None, 'stale': 'BACKUP_OLDER_THAN_26_HOURS', 'failed': 'BACKUP_REPORTED_FAILED', 'disabled': 'BACKUP_DISABLED', 'never_succeeded': 'BACKUP_NEVER_SUCCEEDED'}[expected_status]
        identity = None if expected_ok else {'status': expected_status, 'failureCode': failure, 'lastSuccessAtUtc': success.isoformat() if success else None}
        return {'status': expected_status, 'issue': issue, 'observedAtUtc': observed.isoformat(), 'lastSuccessAtUtc': success.isoformat() if success else None, 'ageSeconds': age, 'failureCode': failure, 'fingerprint': digest(identity) if identity else None}
    except Exception:
        return unavailable('HEALTH_RESPONSE_INCONSISTENT', observed)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def opener():
    # Never let environment proxies receive the private probe or Sending key.
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))


def request_json(request, timeout):
    try:
        response = opener().open(request, timeout=timeout)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read(MAX_RESPONSE + 1)
        if len(body) > MAX_RESPONSE or response.headers.get_content_type() != 'application/json':
            raise MonitorError('HTTP_JSON_RESPONSE_INVALID')
        return response.status, json.loads(body)


def probe(observed):
    try:
        status, body = request_json(urllib.request.Request(HEALTH_URL, method='GET', headers={'accept': 'application/json', 'User-Agent': 'CaleonisBackupCloud/1.0'}), 6)
        return classify(status, body, observed)
    except Exception:
        return unavailable('WORKER_PRIVATE_PROBE_UNAVAILABLE', observed)


@contextlib.contextmanager
def lock_state(path):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if path.is_symlink() or path.with_suffix('.lock').is_symlink():
        raise MonitorError('STATE_SYMLINK_REFUSED')
    stream = path.with_suffix('.lock').open('a+b')
    try:
        stream.seek(0, 2)
        if stream.tell() == 0:
            stream.write(b'0'); stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise MonitorError('MONITOR_RUN_ALREADY_ACTIVE') from None
        try:
            yield
        finally:
            if os.name == 'nt':
                stream.seek(0); msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    finally:
        stream.close()


def save(path, ledger):
    data = (json.dumps(ledger, sort_keys=True, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    if len(data) > MAX_STATE:
        raise MonitorError('STATE_SIZE_LIMIT')
    fd, name = tempfile.mkstemp(prefix='.ledger-', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data); stream.flush(); os.fsync(stream.fileno())
        os.replace(name, path)
        if os.name != 'nt':
            directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
    finally:
        Path(name).unlink(missing_ok=True)


def load(path):
    if not path.exists():
        return None
    try:
        if not stat.S_ISREG(path.stat().st_mode) or path.stat().st_size > MAX_STATE:
            raise ValueError('file')
        state = json.loads(path.read_text(encoding='utf-8'))
        if state['schema'] != SCHEMA or state['stream'] != STREAM or state['recipients'] != list(RECIPIENTS) or type(state['sequence']) is not int or state['sequence'] < 0 or state['initialized'] is not True or not isinstance(state['events'], list) or len(state['events']) > 200:
            raise ValueError('ledger')
        if state['lastFingerprint'] is not None and not HEX.fullmatch(state['lastFingerprint']):
            raise ValueError('fingerprint')
        ids = set()
        for event in state['events']:
            identity = {key: event[key] for key in ('sequence', 'recipient', 'kind', 'fingerprint', 'resolvedFingerprint')}
            identity['stream'] = STREAM
            if event['id'] != digest(identity) or event['id'] in ids or event['recipient'] not in RECIPIENTS or event['kind'] not in ('incident', 'recovery') or event['idempotencyKey'] != 'caleonis-backup-cloud/' + event['id'] or event['payloadSha256'] != digest(event['payload']) or event['payload']['to'] != [event['recipient']] or event['payload']['from'] != SENDER:
                raise ValueError('event')
            ids.add(event['id'])
            if type(event['attemptCount']) is not int or event['attemptCount'] < 0:
                raise ValueError('attempt')
            if event['attemptCount']:
                timestamp(event['firstAttemptAtUtc']); timestamp(event['lastAttemptAtUtc'])
            if event['ack'] is not None and (not UUID.fullmatch(event['ack']['providerMessageId']) or not 200 <= event['ack']['httpStatus'] < 300):
                raise ValueError('ack')
        return state
    except Exception:
        raise MonitorError('ACK_LEDGER_INVALID_NO_RESET') from None


def bounded_orphans(path, current):
    """Retain interrupted atomic writes for reconciliation, then bound usage.

Only our exact temporary-name pattern inside the dedicated state directory is
eligible. The authoritative ledger/ACK file is never modified here.
"""
    retained = 0
    for entry in path.parent.iterdir():
        if not re.fullmatch(r'\.ledger-[a-z0-9_]{8}\.tmp', entry.name):
            continue
        if entry.is_symlink() or not stat.S_ISREG(entry.stat().st_mode) or entry.stat().st_size > MAX_STATE:
            raise MonitorError('STATE_ORPHAN_UNSAFE')
        if os.name == 'posix' and entry.stat().st_uid != os.geteuid():
            raise MonitorError('STATE_ORPHAN_OWNER_REFUSED')
        elapsed = current.timestamp() - entry.stat().st_mtime
        if elapsed >= ORPHAN_RETENTION_SECONDS:
            entry.unlink()
        else:
            retained += 1
    if retained >= MAX_ORPHANS:
        raise MonitorError('STATE_ORPHAN_LIMIT_RECONCILE')
    return retained


def payload(kind, observation, recipient):
    title = 'rétablissement' if kind == 'recovery' else 'incident'
    lines = ['Surveillance distante de fraîcheur/état des sauvegardes du worker.', 'Observation UTC : ' + observation['observedAtUtc'], 'État : ' + observation['status']]
    for key, label in [('lastSuccessAtUtc', 'Dernier succès rapporté UTC'), ('ageSeconds', 'Âge en secondes'), ('issue', 'Catégorie'), ('failureCode', 'Code du worker')]:
        if observation.get(key) is not None:
            lines.append(label + ' : ' + str(observation[key]))
    lines += ['', 'Seuil : 26 heures. Contrôle privé indépendant du PC.', 'Ce signal ne vérifie ni le contenu S3, ni une restauration, ni une panne générale Railway.', 'Aucune donnée client, aucun audio ni secret. Accusé fournisseur distinct de livraison en boîte mail.']
    return {'from': SENDER, 'to': [recipient], 'subject': '[Caléonis] Sauvegarde : ' + title, 'text': '\n'.join(lines), 'tags': [{'name': 'category', 'value': 'backup-cloud'}, {'name': 'event', 'value': kind}]}


def enqueue(state, observation):
    current, previous = observation['fingerprint'], state['lastFingerprint']
    if current == previous:
        return False
    if sum(event['ack'] is None for event in state['events']) > 98:
        raise MonitorError('PENDING_QUEUE_LIMIT')
    state['sequence'] += 1
    kind = 'recovery' if current is None else 'incident'
    for recipient in RECIPIENTS:
        identity = {'stream': STREAM, 'sequence': state['sequence'], 'recipient': recipient, 'kind': kind, 'fingerprint': current, 'resolvedFingerprint': previous if kind == 'recovery' else None}
        event_id = digest(identity)
        body = payload(kind, observation, recipient)
        state['events'].append({**identity, 'id': event_id, 'payload': body, 'payloadSha256': digest(body), 'idempotencyKey': 'caleonis-backup-cloud/' + event_id, 'attemptCount': 0, 'firstAttemptAtUtc': None, 'lastAttemptAtUtc': None, 'ack': None, 'lastFailureCode': None})
    state['lastFingerprint'] = current
    accepted_ids = {event['id'] for event in [e for e in state['events'] if e['ack'] is not None][-100:]}
    state['events'] = [event for event in state['events'] if event['ack'] is None or event['id'] in accepted_ids]
    return True


def send(body, idempotency_key, api_key):
    if body.get('from') != SENDER or body.get('to') not in [[recipient] for recipient in RECIPIENTS]:
        raise MonitorError('EMAIL_ENVELOPE_REFUSED')
    request = urllib.request.Request(EMAIL_URL, method='POST', data=json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode(), headers={'Authorization': 'Bearer ' + api_key, 'Content-Type': 'application/json', 'Idempotency-Key': idempotency_key, 'User-Agent': 'CaleonisBackupCloud/1.0'})
    try:
        status, response = request_json(request, 8)
        if not 200 <= status < 300 or not isinstance(response, dict) or not isinstance(response.get('id'), str) or not UUID.fullmatch(response['id']):
            raise MonitorError({401: 'EMAIL_AUTH_FAILED', 403: 'EMAIL_DOMAIN_REFUSED', 409: 'EMAIL_IDEMPOTENCY_CONFLICT', 429: 'EMAIL_RATE_LIMITED'}.get(status, 'EMAIL_ACCEPTANCE_INVALID'))
        return {'providerMessageId': response['id'], 'httpStatus': status, 'acceptedAtUtc': now().isoformat(), 'deliveryConfirmed': False}
    except MonitorError:
        raise
    except Exception:
        raise MonitorError('EMAIL_ACCEPTANCE_AMBIGUOUS') from None


def cycle(path, observation, *, enabled=False, baseline_approved=False, sender=None, clock=now, writer=save):
    result = {'detectorStatus': observation['status'], 'sendingEnabled': enabled, 'accepted': [], 'failureCodes': [], 'providerDeliveryConfirmed': False}
    with lock_state(path):
        result['retainedInterruptedWrites'] = bounded_orphans(path, clock())
        state = load(path)
        if state is None:
            if not baseline_approved or observation['fingerprint'] is not None:
                raise MonitorError('FRESH_BASELINE_APPROVAL_REQUIRED')
            state = {'schema': SCHEMA, 'stream': STREAM, 'recipients': list(RECIPIENTS), 'sequence': 0, 'initialized': True, 'lastFingerprint': None, 'events': []}
        result['newTransition'] = enqueue(state, observation)
        state['lastObservedAtUtc'] = observation['observedAtUtc']
        writer(path, state)  # durable outbox before any HTTPS side effect
        if enabled:
            for recipient in RECIPIENTS:
                event = next((e for e in state['events'] if e['recipient'] == recipient and e['ack'] is None), None)
                if event is None:
                    continue
                current = clock()
                if event['attemptCount']:
                    elapsed = (current - timestamp(event['firstAttemptAtUtc'])).total_seconds()
                    if elapsed >= RETRY_WINDOW or elapsed < -60:
                        event['lastFailureCode'] = 'EMAIL_ACCEPTANCE_RECONCILIATION_REQUIRED'
                        result['failureCodes'].append(event['lastFailureCode']); writer(path, state); continue
                if event['attemptCount'] == 0:
                    event['firstAttemptAtUtc'] = current.isoformat()
                event['attemptCount'] += 1; event['lastAttemptAtUtc'] = current.isoformat()
                writer(path, state)  # persist first ambiguous-attempt time before POST
                try:
                    ack = sender(event['payload'], event['idempotencyKey'])
                    if not isinstance(ack, dict) or not UUID.fullmatch(str(ack.get('providerMessageId', ''))) or type(ack.get('httpStatus')) is not int or not 200 <= ack['httpStatus'] < 300:
                        raise MonitorError('EMAIL_ACCEPTANCE_INVALID')
                    event['ack'] = ack; event['lastFailureCode'] = None
                    writer(path, state)
                    result['accepted'].append({'recipient': recipient, 'kind': event['kind'], 'providerMessageId': ack['providerMessageId']})
                except Exception as error:
                    event['ack'] = None
                    code = str(error) if isinstance(error, MonitorError) and CODE.fullmatch(str(error)) else 'EMAIL_SEND_OR_ACK_WRITE_AMBIGUOUS'
                    event['lastFailureCode'] = code; result['failureCodes'].append(code)
                    writer(path, state)
        result['pendingCount'] = sum(e['ack'] is None for e in state['events'])
        result['ledgerBytes'] = path.stat().st_size
        return result


def config_guard(env):
    if env.get('RAILWAY_PROJECT_ID') != '71b07a28-31d3-442a-89d1-e0d2955985bb' or env.get('RAILWAY_ENVIRONMENT_ID') != '4398d464-3b88-4074-882b-6a17c7b793e7':
        raise MonitorError('PROJECT_ENVIRONMENT_BINDING_REQUIRED')
    forbidden = ('DATABASE_URL', 'LOBBYSTACK_', 'S3_', 'AWS_', 'TWILIO_', 'OPENAI_', 'GOOGLE_', 'ENCRYPTION_KEY', 'SMTP_PASSWORD', 'RAILWAY_TOKEN', 'RAILWAY_API_TOKEN')
    if any(value and any(key == prefix or prefix.endswith('_') and key.startswith(prefix) for prefix in forbidden) for key, value in env.items()):
        raise MonitorError('EXCESS_CREDENTIAL_SCOPE_REFUSED')
    if env.get('BACKUP_MONITOR_ARMED') != 'true':
        raise MonitorError('MONITOR_NOT_ARMED')
    if env.get('BACKUP_HEALTH_URL') != HEALTH_URL:
        raise MonitorError('PRIVATE_HEALTH_BINDING_REQUIRED')
    if env.get('RAILWAY_VOLUME_MOUNT_PATH') != '/state':
        raise MonitorError('PERSISTENT_VOLUME_BINDING_REQUIRED')
    owner = env.get('BACKUP_MONITOR_OWNER_EMAIL', '').lower()
    if not re.fullmatch(r'[^\s@,]{1,64}@[^\s@,]{1,190}\.[a-z]{2,24}', owner) or owner == CONTACT or owner.endswith('.invalid'):
        raise MonitorError('AUTHORIZED_OWNER_RECIPIENT_REQUIRED')
    enabled = env.get('BACKUP_MONITOR_SEND') == 'true'
    key = env.get('RESEND_API_KEY', '')
    if enabled and not re.fullmatch(r're_[A-Za-z0-9_-]{10,200}', key):
        raise MonitorError('EXISTING_SENDING_REFERENCE_REQUIRED')
    return enabled, key


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if not args.once:
        print(json.dumps({'mode': 'plan_only', 'network': False, 'stateWrite': False, 'cloudMutation': False})); return 0
    try:
        enabled, key = config_guard(os.environ)
        if os.name != 'posix' or os.geteuid() == 0:
            raise MonitorError('NONROOT_LINUX_RUNTIME_REQUIRED')
        result = cycle(Path('/state/ledger.json'), probe(now()), enabled=enabled, baseline_approved=os.environ.get('BACKUP_MONITOR_BASELINE_APPROVED') == 'true', sender=lambda body, idem: send(body, idem, key))
        print(json.dumps({'event': 'backup.cloud.cycle', 'observedAtUtc': now().isoformat(), **result}))
        return 3 if result['failureCodes'] else 2 if result['detectorStatus'] != 'fresh' or result['pendingCount'] else 0
    except Exception as error:
        code = str(error) if isinstance(error, MonitorError) and CODE.fullmatch(str(error)) else 'MONITOR_INTERNAL_FAILURE'
        print(json.dumps({'event': 'backup.cloud.cycle', 'failureCode': code, 'notificationAccepted': False})); return 3


if __name__ == '__main__':
    raise SystemExit(main())
