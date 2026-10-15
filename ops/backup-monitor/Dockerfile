FROM python:3.13-slim-bookworm@sha256:a1165e272e578941b84abc79e4ab38a0305cd12803a5c4247979ac7655f4d641 AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONHASHSEED=0
WORKDIR /app
RUN groupadd --gid 10001 monitor && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin monitor && mkdir /state && chown 10001:10001 /state && chmod 0700 /state
COPY monitor.py supervise.py /app/

FROM base AS offline_tests
COPY test_monitor.py source-health-fixtures.json /app/
RUN python -I -B /app/test_monitor.py

FROM base AS runtime
COPY --from=offline_tests /app/local-test-results.json /app/build-test-results.json
# No port, web server, pip dependency, cloud CLI or application source.
# PID1 fixes only dedicated volume ownership, then drops to uid10001 before IO.
ENTRYPOINT ["python", "-I", "-B", "/app/supervise.py"]
