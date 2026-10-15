"""Offline contract/failure/restart tests. No real HTTP, mail or cloud action."""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent


def module(name):
    spec = importlib.util.spec_from_file_location(name, HERE / (name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


m, supervisor = module('monitor'), module('supervise')
NOW = datetime(2026, 10, 15, 12, tzinfo=timezone.utc)
ACK = {'providerMessageId': '11111111-2222-4333-8444-555555555555', 'httpStatus': 200, 'acceptedAtUtc': NOW.isoformat(), 'deliveryConfirmed': False}


def body(status='fresh'):
    enabled = status != 'disabled'
    success = None if status in ('never_succeeded', 'disabled') else NOW-timedelta(hours=27 if status == 'stale' else 1)
    return {'ok': status == 'fresh', 'status': status, 'enabled': enabled, 'running': False, 'lastSuccessAt': success.isoformat() if success else None, 'ageSeconds': int((NOW-success).total_seconds()) if success else None, 'lastCheckedAt': NOW.isoformat(), 'failureCode': 'BACKUP_STORAGE_BUDGET_REACHED' if status == 'failed' else None}


def observation(status='fresh', at=NOW):
    return m.classify(200 if status == 'fresh' else 503, body(status), at)


class Cases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.path = Path(self.temp.name) / 'ledger.json'; self.calls = []
        self.network = patch.object(m.urllib.request.OpenerDirector, 'open', side_effect=AssertionError('real network forbidden'))
        self.network.start()

    def tearDown(self):
        self.network.stop(); self.temp.cleanup()

    def sender(self, payload, key):
        self.calls.append((copy.deepcopy(payload), key)); return copy.deepcopy(ACK)

    def run_cycle(self, obs, **kwargs):
        options = {'enabled': True, 'sender': self.sender, 'clock': lambda: NOW}; options.update(kwargs)
        return m.cycle(self.path, obs, **options)

    def baseline(self):
        return self.run_cycle(observation(), baseline_approved=True)

    def test_exact_worker_contract_all_five_statuses(self):
        for status in ('fresh', 'stale', 'failed', 'disabled', 'never_succeeded'):
            with self.subTest(status=status):
                result = observation(status)
                self.assertEqual(result['status'], status)
                self.assertEqual(result['fingerprint'] is None, status == 'fresh')

    def test_fixtures_emitted_by_actual_sha611_typescript_function(self):
        source = json.loads((HERE/'source-health-fixtures.json').read_text(encoding='utf-8'))
        self.assertTrue(source['generatedFromActualTypeScriptFunction'])
        observed = m.timestamp(source['observedAtUtc'])
        for fixture in source['fixtures']:
            with self.subTest(case=fixture['name']):
                self.assertEqual(m.classify(fixture['httpStatus'], fixture['body'], observed)['status'], fixture['expectedStatus'])

    def test_boundary_26h_and_source_age_clamping(self):
        value = body(); value.update(lastSuccessAt=(NOW-timedelta(hours=26)).isoformat(), ageSeconds=26*3600)
        self.assertEqual(m.classify(200, value, NOW)['status'], 'fresh')
        value.update(ok=False, status='stale', lastSuccessAt=(NOW-timedelta(hours=26, seconds=1)).isoformat(), ageSeconds=26*3600+1)
        self.assertEqual(m.classify(503, value, NOW)['status'], 'stale')
        value = body(); value.update(lastSuccessAt=(NOW+timedelta(hours=1)).isoformat(), ageSeconds=0)
        self.assertEqual(m.classify(200, value, NOW)['status'], 'monitor_unavailable')

    def test_http_or_flags_age_time_contract_inconsistency_never_fresh(self):
        variants = [dict(body(), ok='true'), dict(body(), enabled=1), dict(body(), running=None), dict(body(), ageSeconds=True), dict(body(), ageSeconds=0), dict(body(), failureCode='secret https://example.invalid'), dict(body(), extraField='secret'), dict(body(), lastSuccessAt='bad'), dict(body(), lastCheckedAt='bad')]
        for value in variants:
            self.assertEqual(m.classify(200, value, NOW)['status'], 'monitor_unavailable')
        self.assertEqual(m.classify(503, body(), NOW)['status'], 'monitor_unavailable')

    def test_unreachable_or_bad_json_probe_is_incident(self):
        self.assertEqual(m.probe(NOW)['status'], 'monitor_unavailable')
        with patch.object(m, 'request_json', return_value=(200, {'ok': True})):
            self.assertEqual(m.probe(NOW)['status'], 'monitor_unavailable')

    def test_probe_fixed_get_and_timeout(self):
        def fake(request, timeout):
            self.assertEqual(request.full_url, m.HEALTH_URL); self.assertEqual(request.method, 'GET'); self.assertEqual(timeout, 6)
            self.assertNotIn('Authorization', request.headers); return 200, body()
        with patch.object(m, 'request_json', side_effect=fake):
            self.assertEqual(m.probe(NOW)['status'], 'fresh')

    def test_new_ledger_requires_approved_fresh_baseline(self):
        for obs, approved in ((observation(), False), (observation('stale'), True)):
            with self.assertRaises(m.MonitorError):
                self.run_cycle(obs, baseline_approved=approved)
        self.assertFalse(self.path.exists()); self.assertEqual(self.calls, [])

    def test_fresh_baseline_silent_persistent(self):
        result = self.baseline(); self.assertEqual(result['pendingCount'], 0); self.assertEqual(self.calls, [])
        self.assertTrue(m.load(self.path)['initialized'])

    def test_incident_ack_per_recipient_and_healthy_recovery_once(self):
        self.baseline()
        self.assertEqual(len(self.run_cycle(observation('stale'))['accepted']), 2)
        self.assertEqual(self.run_cycle(observation('stale'))['accepted'], [])
        self.assertEqual(len(self.run_cycle(observation())['accepted']), 2)
        self.assertEqual(self.run_cycle(observation())['accepted'], [])
        self.assertEqual(len(self.calls), 4)
        self.assertEqual(len({key for _, key in self.calls}), 4)

    def test_one_recipient_retry_does_not_repeat_other_ack(self):
        self.baseline()
        def partial(payload, key):
            if payload['to'] == [m.RECIPIENTS[0]]: raise m.MonitorError('EMAIL_ACCEPTANCE_AMBIGUOUS')
            return self.sender(payload, key)
        self.assertEqual(self.run_cycle(observation('failed'), sender=partial)['pendingCount'], 1)
        result = self.run_cycle(observation('failed'))
        self.assertEqual([a['recipient'] for a in result['accepted']], [m.RECIPIENTS[0]])
        self.assertEqual(result['pendingCount'], 0)

    def test_restart_retry_freezes_payload_and_idempotency(self):
        self.baseline()
        captured = []
        def ambiguous(payload, key):
            captured.append((copy.deepcopy(payload), key)); raise m.MonitorError('EMAIL_ACCEPTANCE_AMBIGUOUS')
        self.run_cycle(observation('stale'), sender=ambiguous)
        self.assertTrue(all(e['attemptCount'] == 1 for e in m.load(self.path)['events']))
        result = self.run_cycle(observation('stale'), clock=lambda: NOW+timedelta(hours=1))
        self.assertEqual(captured, self.calls); self.assertEqual(result['pendingCount'], 0)

    def test_23h_retry_stop_keeps_payload_and_first_attempt(self):
        self.baseline()
        def ambiguous(*args): raise m.MonitorError('EMAIL_ACCEPTANCE_AMBIGUOUS')
        self.run_cycle(observation('failed'), sender=ambiguous)
        before = copy.deepcopy(m.load(self.path)['events'])
        result = self.run_cycle(observation('failed'), clock=lambda: NOW+timedelta(hours=23))
        after = m.load(self.path)['events']
        self.assertIn('EMAIL_ACCEPTANCE_RECONCILIATION_REQUIRED', result['failureCodes']); self.assertEqual(self.calls, [])
        for a, b in zip(before, after):
            for key in ('payload', 'idempotencyKey', 'firstAttemptAtUtc', 'attemptCount'):
                self.assertEqual(a[key], b[key])

    def test_recovery_never_passes_unacknowledged_incident_same_recipient(self):
        self.baseline(); self.run_cycle(observation('stale'), enabled=False)
        result = self.run_cycle(observation())
        self.assertEqual([a['kind'] for a in result['accepted']], ['incident', 'incident'])
        self.assertEqual(result['pendingCount'], 2)
        result = self.run_cycle(observation())
        self.assertEqual([a['kind'] for a in result['accepted']], ['recovery', 'recovery'])

    def test_no_transport_in_observe_mode(self):
        self.baseline(); self.run_cycle(observation('failed'), enabled=False)
        self.assertEqual(self.calls, []); self.assertEqual(len(m.load(self.path)['events']), 2)

    def test_write_before_post_and_ack_write_crash_retry(self):
        self.baseline()
        def inspect(payload, key):
            persisted = next(e for e in m.load(self.path)['events'] if e['idempotencyKey'] == key)
            self.assertEqual(persisted['attemptCount'], 1); self.assertIsNotNone(persisted['firstAttemptAtUtc']); self.assertIsNone(persisted['ack'])
            return self.sender(payload, key)
        failed = [False]
        def fail_one_ack(path, state):
            if not failed[0] and any(e['ack'] is not None for e in state['events']):
                failed[0] = True; raise OSError('simulated ACK persistence loss')
            m.save(path, state)
        first = self.run_cycle(observation('stale'), sender=inspect, writer=fail_one_ack)
        self.assertEqual(first['pendingCount'], 1)
        first_call = self.calls[0]
        self.run_cycle(observation('stale'))
        self.assertEqual(self.calls[-1], first_call)

    def test_corrupt_or_changed_ledger_fails_closed_without_reset(self):
        self.baseline(); self.run_cycle(observation('failed'), enabled=False)
        original = json.loads(self.path.read_text()); original['events'][0]['payload']['to'] = ['other@example.invalid']
        self.path.write_text(json.dumps(original)); before = self.path.read_bytes()
        with self.assertRaises(m.MonitorError): self.run_cycle(observation('failed'))
        self.assertEqual(self.path.read_bytes(), before); self.assertEqual(self.calls, [])

    def test_lock_prevents_concurrent_run_and_recovers_after_release(self):
        self.baseline()
        with m.lock_state(self.path):
            with self.assertRaises(m.MonitorError): self.run_cycle(observation('stale'))
        self.assertEqual(len(self.run_cycle(observation('stale'))['accepted']), 2)

    def test_state_size_limit_preserves_previous_file(self):
        self.baseline(); before = self.path.read_bytes()
        with self.assertRaises(m.MonitorError): m.save(self.path, {'oversize': 'a'*(m.MAX_STATE+1)})
        self.assertEqual(self.path.read_bytes(), before)

    def test_interrupted_writes_retained_24h_then_pruned_without_touching_ledger(self):
        self.baseline(); before = self.path.read_bytes()
        old = self.path.parent/'.ledger-abcd1234.tmp'; old.write_bytes(b'old interrupted ACK')
        fresh = self.path.parent/'.ledger-1234abcd.tmp'; fresh.write_bytes(b'recent interrupted ACK')
        unrelated = self.path.parent/'other.tmp'; unrelated.write_bytes(b'operator file')
        os.utime(old, (NOW.timestamp()-86401, NOW.timestamp()-86401))
        os.utime(fresh, (NOW.timestamp()-60, NOW.timestamp()-60))
        self.assertEqual(m.bounded_orphans(self.path, NOW), 1)
        self.assertFalse(old.exists()); self.assertTrue(fresh.exists()); self.assertTrue(unrelated.exists())
        self.assertEqual(self.path.read_bytes(), before)

    def test_orphan_count_budget_fails_closed_without_more_state_writes(self):
        self.baseline(); before = self.path.read_bytes()
        for i in range(m.MAX_ORPHANS):
            candidate = self.path.parent/('.ledger-'+str(i).zfill(8)+'.tmp'); candidate.write_bytes(b'orphan')
            os.utime(candidate, (NOW.timestamp(), NOW.timestamp()))
        with self.assertRaises(m.MonitorError): self.run_cycle(observation('stale'))
        self.assertEqual(self.path.read_bytes(), before); self.assertEqual(self.calls, [])

    def test_negative_clock_jump_requires_reconciliation(self):
        self.baseline()
        def ambiguous(*args): raise m.MonitorError('EMAIL_ACCEPTANCE_AMBIGUOUS')
        self.run_cycle(observation('stale'), sender=ambiguous)
        result = self.run_cycle(observation('stale'), clock=lambda: NOW-timedelta(minutes=2))
        self.assertIn('EMAIL_ACCEPTANCE_RECONCILIATION_REQUIRED', result['failureCodes']); self.assertEqual(self.calls, [])

    def test_provider_uuid_and_http_2xx_both_required(self):
        self.baseline()
        result = self.run_cycle(observation('stale'), sender=lambda *args: dict(ACK, httpStatus=503))
        self.assertEqual(result['accepted'], []); self.assertEqual(result['pendingCount'], 2)
        self.assertTrue(all(e['ack'] is None for e in m.load(self.path)['events']))

    def test_resend_fixed_endpoint_timeout_and_no_arbitrary_recipients(self):
        def fake(request, timeout):
            self.assertEqual(request.full_url, m.EMAIL_URL); self.assertEqual(request.method, 'POST'); self.assertEqual(timeout, 8)
            self.assertEqual(json.loads(request.data)['to'], [m.RECIPIENTS[0]])
            return 200, {'id': ACK['providerMessageId']}
        with patch.object(m, 'request_json', side_effect=fake):
            ack = m.send(m.payload('incident', observation('stale'), m.RECIPIENTS[0]), 'fixed-idempotency', 'fake-key')
        self.assertFalse(ack['deliveryConfirmed'])

    def test_proxies_disabled_redirect_refused_and_bounded_response(self):
        self.assertIsNone(m.NoRedirect().redirect_request(None, None, 307, '', {}, 'https://other.invalid'))
        class Response(io.BytesIO):
            status = 200
            from email.message import Message
            headers = Message(); headers['content-type'] = 'application/json'
        class Open:
            def open(self, *args, **kwargs): return Response(b'x'*(m.MAX_RESPONSE+1))
        with patch.object(m, 'opener', return_value=Open()):
            with self.assertRaises(m.MonitorError): m.request_json(None, 1)

    def test_config_refuses_extra_secrets_foreign_url_or_missing_volume(self):
        env = {'RAILWAY_PROJECT_ID': '71b07a28-31d3-442a-89d1-e0d2955985bb', 'RAILWAY_ENVIRONMENT_ID': '4398d464-3b88-4074-882b-6a17c7b793e7', 'RAILWAY_VOLUME_MOUNT_PATH': '/state', 'BACKUP_MONITOR_ARMED': 'true', 'BACKUP_HEALTH_URL': m.HEALTH_URL, 'BACKUP_MONITOR_SEND': 'false', 'BACKUP_MONITOR_OWNER_EMAIL': 'owner@example.com'}
        self.assertEqual(m.config_guard(env), (False, ''))
        for key in ('DATABASE_URL', 'S3_ACCESS_KEY_ID', 'RAILWAY_TOKEN', 'TWILIO_AUTH_TOKEN', 'OPENAI_API_KEY', 'ENCRYPTION_KEY'):
            with self.subTest(key=key), self.assertRaises(m.MonitorError): m.config_guard(dict(env, **{key: 'secret'}))
        for key, value in [('BACKUP_HEALTH_URL', 'http://other.invalid'), ('RAILWAY_VOLUME_MOUNT_PATH', ''), ('BACKUP_MONITOR_ARMED', 'false'), ('BACKUP_MONITOR_SEND', 'true'), ('BACKUP_MONITOR_OWNER_EMAIL', '')]:
            with self.subTest(key=key), self.assertRaises(m.MonitorError): m.config_guard(dict(env, **{key: value}))

    def test_default_cli_plan_has_no_side_effect(self):
        result = subprocess.run([sys.executable, str(HERE/'monitor.py')], capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0); self.assertFalse(json.loads(result.stdout)['network'])

    def test_watchdog_reaps_hung_child_before_deadline_budget(self):
        start = time.monotonic()
        with self.assertRaises(subprocess.TimeoutExpired):
            supervisor.run_bounded([sys.executable, '-c', 'import time;time.sleep(30)'], deadline=0.1)
        self.assertLess(time.monotonic()-start, 3)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Cases))
    evidence = {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'testsRun': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'passed': result.wasSuccessful(), 'networkCalls': 0, 'externalEmails': 0, 'cloudMutations': 0, 'platform': sys.platform, 'containerLinuxUidVolumeAndRlimitsQualified': False}
    (HERE/'local-test-results.json').write_text(json.dumps(evidence, indent=2)+'\n', encoding='utf-8')
    raise SystemExit(0 if result.wasSuccessful() else 1)
