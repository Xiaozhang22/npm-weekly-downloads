// 共享工具函数：npm 数据获取、按周汇总、KV 操作

const DEFAULT_PACKAGES = [
  '@anthropic-ai/claude-code',
  '@google/gemini-cli',
  '@qoder-ai/qodercli',
];

const STALE_MS = 12 * 60 * 60 * 1000; // 12 小时

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getPackageList(env) {
  const raw = await env["npm-week"].get('config:packages');
  if (!raw) {
    await env["npm-week"].put('config:packages', JSON.stringify(DEFAULT_PACKAGES));
    return [...DEFAULT_PACKAGES];
  }
  return JSON.parse(raw);
}

export async function fetchNpmDownloads(packageName) {
  const url = `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(packageName)}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'npm-weekly-downloads' },
  });
  if (!resp.ok) throw new Error(`npm API returned ${resp.status}`);
  const data = await resp.json();
  return data.downloads;
}

export function groupByWeek(downloads) {
  const weeks = {};
  for (const entry of downloads) {
    const day = new Date(entry.day + 'T00:00:00Z');
    const dow = day.getUTCDay(); // 0=Sun ... 6=Sat
    const daysSinceThu = (dow - 4 + 7) % 7;
    const weekStart = new Date(day);
    weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceThu);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const key = fmtDate(weekStart);
    if (!weeks[key]) {
      weeks[key] = { start: fmtDate(weekStart), end: fmtDate(weekEnd), downloads: 0 };
    }
    weeks[key].downloads += entry.downloads;
  }
  return Object.values(weeks).sort((a, b) => a.start.localeCompare(b.start));
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function refreshAllPackages(env) {
  const packages = await getPackageList(env);
  await Promise.allSettled(
    packages.map(async (pkg) => {
      const downloads = await fetchNpmDownloads(pkg);
      const weeks = groupByWeek(downloads);
      await env["npm-week"].put(`data:${pkg}`, JSON.stringify({ weeks }));
    }),
  );
  await env["npm-week"].put('meta:last_updated', new Date().toISOString());
}

export function isStale(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > STALE_MS;
}

export function isVeryStale(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000;
}
