"""Public-rate estimate, no API/config reads and no financial promises."""
import json

rates = {'ramUsdGbMinute': 0.000231, 'cpuUsdVcpuMinute': 0.000463, 'volumeUsdGbMonth': 0.15, 'egressUsdGb': 0.05}
estimates = []
for days in (30, 31):
    runs = days * 24
    compute = runs * (1 * rates['cpuUsdVcpuMinute'] + 0.25 * rates['ramUsdGbMinute'])
    estimates.append({'days': days, 'hourlyRuns': runs, 'maximumCycleMinutesAssumed': 1, 'memoryLimitMiBToVerify': 256, 'cpuLimitVcpuToVerify': 1, 'conservativeUsedVolumeGbAssumed': 0.5, 'computeUsd': round(compute, 6), 'volumeUsd': 0.075, 'incrementalEstimateUsdBeforeEgressTax': round(compute + 0.075, 6)})
print(json.dumps({'ratesCheckedAtUtcDate': '2026-10-15', 'sources': ['https://docs.railway.com/pricing/plans', 'https://docs.railway.com/volumes/reference'], 'rates': rates, 'estimates': estimates, 'assumptionsNotVerified': ['current paid plan/credit', 'actual service resource limits', 'minimum volume capacity at creation', 'tax', 'total existing backup spend'], 'newSubscriptionRequested': False, 'upgradeAuthorizedByThisArtifact': False, 'hardProviderBudgetCap': False}, indent=2))
