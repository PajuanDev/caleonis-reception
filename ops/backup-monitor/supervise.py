"""Bound one cron cycle; volume ownership setup only before dropping root."""
import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys

DEADLINE_SECONDS = 55
UID = GID = 10001


def runtime_init():
    if os.name != 'posix':
        raise RuntimeError('LINUX_REQUIRED')
    import resource
    state = Path('/state')
    if state.is_symlink() or not state.is_dir() or not os.path.ismount(state):
        raise RuntimeError('PERSISTENT_VOLUME_REQUIRED')
    if os.geteuid() == 0:
        # A mounted Railway volume can initially be root-owned. Touch only the
        # dedicated state directory and these two known regular ledger files.
        os.chown(state, UID, GID); os.chmod(state, 0o700)
        for name in ('ledger.json', 'ledger.lock'):
            path = state / name
            if path.is_symlink():
                raise RuntimeError('STATE_SYMLINK_REFUSED')
            if path.exists():
                if not stat.S_ISREG(path.stat().st_mode):
                    raise RuntimeError('STATE_REGULAR_FILE_REQUIRED')
                os.chown(path, UID, GID); os.chmod(path, 0o600)
        os.setgroups([]); os.setgid(GID); os.setuid(UID)
    if os.geteuid() != UID:
        raise RuntimeError('DEDICATED_UID_REQUIRED')
    resource.setrlimit(resource.RLIMIT_AS, (192 * 1024 * 1024, 192 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (2 * 1024 * 1024, 2 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def run_bounded(command, deadline=DEADLINE_SECONDS, preexec_fn=None):
    process = None
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=os.name == 'posix', preexec_fn=preexec_fn)
        output, _ = process.communicate(timeout=deadline)
        if len(output) > 16384:
            raise RuntimeError('OUTPUT_SIZE_LIMIT')
        return process.returncode, output
    finally:
        if process is not None and process.poll() is None:
            if os.name == 'posix':
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            process.wait(timeout=3)


def child_limits():
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (5, 6))


def main():
    try:
        runtime_init()
        def interrupted(signum, frame):
            raise KeyboardInterrupt()
        signal.signal(signal.SIGTERM, interrupted)
        code, output = run_bounded([sys.executable, '-I', '-B', '/app/monitor.py', '--once'], preexec_fn=child_limits)
        print(output.decode('utf-8', errors='strict').strip(), flush=True)
        return code if code >= 0 else 3
    except subprocess.TimeoutExpired:
        print(json.dumps({'event': 'backup.cloud.supervisor', 'failureCode': 'CYCLE_DEADLINE_EXCEEDED', 'maxCycleSeconds': 60}), flush=True); return 3
    except BaseException:
        print(json.dumps({'event': 'backup.cloud.supervisor', 'failureCode': 'SUPERVISOR_FAILED_DETAILS_SUPPRESSED'}), flush=True); return 3

if __name__ == '__main__':
    raise SystemExit(main())
