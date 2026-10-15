"""Offline container qualification; fake ACKs, no network or cloud credentials."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import resource
import sys


def load(name):
    spec = importlib.util.spec_from_file_location(name, '/app/' + name + '.py')
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('phase', choices=('seed', 'resume', 'missing-mount')); args = parser.parse_args()
    supervisor = load('supervise')
    if args.phase == 'missing-mount':
        try:
            supervisor.runtime_init()
        except RuntimeError as error:
            assert str(error) == 'PERSISTENT_VOLUME_REQUIRED'
            print(json.dumps({'phase': args.phase, 'mountRefused': True, 'startingUid': os.geteuid(), 'networkCalls': 0})); return
        raise AssertionError('ephemeral state accepted')
    supervisor.runtime_init()
    assert os.geteuid() == 10001 and os.getegid() == 10001
    assert os.path.ismount('/state') and Path('/state').stat().st_uid == 10001
    assert resource.getrlimit(resource.RLIMIT_AS) == (192*1024*1024,)*2
    assert resource.getrlimit(resource.RLIMIT_NOFILE) == (64, 64)
    assert resource.getrlimit(resource.RLIMIT_FSIZE) == (2*1024*1024,)*2
    assert resource.getrlimit(resource.RLIMIT_CORE) == (0, 0)
    memory = int(Path('/sys/fs/cgroup/memory.max').read_text())
    quota, period = [int(v) for v in Path('/sys/fs/cgroup/cpu.max').read_text().split()]
    assert memory <= 256*1024*1024 and quota/period <= 1
    code, raw = supervisor.run_bounded([sys.executable, '-I', '-B', '-c', 'import resource,json; print(json.dumps(resource.getrlimit(resource.RLIMIT_CPU)))'], preexec_fn=supervisor.child_limits)
    assert code == 0 and json.loads(raw) == [5, 6]
    monitor = load('monitor'); path = Path('/state/ledger.json')
    calls = []
    def fake_sender(body, key):
        calls.append(key)
        return {'providerMessageId': '11111111-2222-4333-8444-555555555555', 'httpStatus': 200, 'acceptedAtUtc': monitor.now().isoformat(), 'deliveryConfirmed': False}
    incident = monitor.unavailable('OFFLINE_FIXTURE_ONLY', monitor.now())
    if args.phase == 'seed':
        assert not path.exists()
        healthy = {'status': 'fresh', 'fingerprint': None, 'observedAtUtc': monitor.now().isoformat()}
        monitor.cycle(path, healthy, baseline_approved=True, enabled=False)
        result = monitor.cycle(path, incident, enabled=True, sender=fake_sender)
        assert len(result['accepted']) == 2 and result['pendingCount'] == 0
    else:
        state = monitor.load(path)
        assert len(state['events']) == 2 and all(event['ack'] is not None for event in state['events'])
        result = monitor.cycle(path, incident, enabled=True, sender=fake_sender)
        assert not calls and not result['accepted'] and result['pendingCount'] == 0
    print(json.dumps({'phase': args.phase, 'status': 'PASS', 'uid': os.geteuid(), 'mountedVolume': True, 'memoryLimitBytes': memory, 'cpuQuotaVcpu': quota/period, 'cpuRlimit': [5, 6], 'ledgerSurvivedRestart': args.phase == 'resume', 'fakeTransportOnly': True, 'networkCalls': 0, 'actualEmails': 0}))


if __name__ == '__main__':
    main()
