// State
let appData = { packages: [], data: {}, lastUpdated: null };

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

// ========== Init ==========

document.addEventListener('DOMContentLoaded', loadData);

document.getElementById('packageInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addPackage();
});

// ========== API ==========

async function loadData() {
  try {
    const resp = await fetch('/api/packages');
    if (!resp.ok) throw new Error('Failed to load');
    appData = await resp.json();
    render();
  } catch (e) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('emptyText').textContent =
      'Failed to load data. Please check KV binding and click Refresh.';
    showToast('Failed to load: ' + e.message, 'error');
  }
}

async function addPackage() {
  var input = document.getElementById('packageInput');
  var name = input.value.trim();
  if (!name) return;

  showLoading('Adding ' + name + ' ...');
  try {
    var resp = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name }),
    });
    var result = await resp.json();
    if (!resp.ok) {
      showToast(result.error || 'Add failed', 'error');
      return;
    }
    input.value = '';
    showToast('Added ' + name, 'success');
    await loadData();
  } catch (e) {
    showToast('Add failed: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

async function deletePackage(name) {
  if (!confirm('Remove ' + name + ' ?')) return;

  showLoading('Removing...');
  try {
    var resp = await fetch('/api/packages?name=' + encodeURIComponent(name), {
      method: 'DELETE',
    });
    if (!resp.ok) {
      var result = await resp.json();
      showToast(result.error || 'Remove failed', 'error');
      return;
    }
    showToast('Removed ' + name, 'success');
    await loadData();
  } catch (e) {
    showToast('Remove failed: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

async function refreshData() {
  showLoading('Refreshing all data...');
  try {
    var resp = await fetch('/api/refresh', { method: 'POST' });
    if (!resp.ok) throw new Error('Refresh failed');
    showToast('Data refreshed', 'success');
    await loadData();
  } catch (e) {
    showToast('Refresh failed: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

// ========== Render ==========

function render() {
  var packages = appData.packages;
  var data = appData.data;
  var lastUpdated = appData.lastUpdated;

  // Timestamp
  var tsEl = document.getElementById('lastUpdated');
  if (lastUpdated) {
    tsEl.textContent = 'Last updated: ' + new Date(lastUpdated).toLocaleString('zh-CN');
  } else {
    tsEl.textContent = 'No data yet. Click Refresh to fetch.';
  }

  // Package tags
  renderPackageTags(packages);

  // Check data
  var hasPackages = packages.length > 0;
  var hasData = packages.some(function (p) {
    return data[p] && data[p].weeks && data[p].weeks.length > 0;
  });

  var tableWrapper = document.getElementById('tableWrapper');
  var emptyState = document.getElementById('emptyState');
  var emptyText = document.getElementById('emptyText');

  if (!hasPackages) {
    tableWrapper.style.display = 'none';
    emptyState.style.display = 'block';
    emptyText.textContent = 'No packages. Use the input above to add one.';
    return;
  }

  if (!hasData) {
    tableWrapper.style.display = 'none';
    emptyState.style.display = 'block';
    emptyText.textContent = 'No download data yet. Click "Refresh" to fetch.';
    return;
  }

  emptyState.style.display = 'none';
  tableWrapper.style.display = 'block';

  // Collect all weeks
  var allWeeksMap = {};
  packages.forEach(function (pkg) {
    var weeks = (data[pkg] && data[pkg].weeks) || [];
    weeks.forEach(function (w) {
      if (!allWeeksMap[w.start]) {
        allWeeksMap[w.start] = { start: w.start, end: w.end };
      }
    });
  });
  // Reverse chronological (newest first)
  var allWeeks = Object.values(allWeeksMap).sort(function (a, b) {
    return b.start.localeCompare(a.start);
  });

  // Per-package week lookup
  var weekMaps = packages.map(function (pkg) {
    var map = {};
    var weeks = (data[pkg] && data[pkg].weeks) || [];
    weeks.forEach(function (w) {
      map[w.start] = w.downloads;
    });
    return map;
  });

  // Today for current week highlight
  var today = new Date().toISOString().slice(0, 10);

  // Header
  var headerRow = document.getElementById('tableHeader');
  var headerHTML = '<th>Week Start</th><th>Week End</th>';
  packages.forEach(function (pkg) {
    var short = pkg.split('/').pop();
    headerHTML += '<th>' + escapeHTML(short) + '</th>';
  });
  headerRow.innerHTML = headerHTML;

  // Body
  var tbody = document.getElementById('tableBody');
  var bodyHTML = '';
  var totals = new Array(packages.length).fill(0);

  allWeeks.forEach(function (week) {
    var isCurrent = today >= week.start && today <= week.end;
    bodyHTML += '<tr' + (isCurrent ? ' class="current-week"' : '') + '>';
    bodyHTML += '<td>' + week.start + '</td><td>' + week.end + '</td>';
    packages.forEach(function (_, i) {
      var count = weekMaps[i][week.start] || 0;
      totals[i] += count;
      bodyHTML += '<td>' + count.toLocaleString() + '</td>';
    });
    bodyHTML += '</tr>';
  });
  tbody.innerHTML = bodyHTML;

  // Footer
  var footRow = document.getElementById('tableFoot');
  var footHTML = '<td colspan="2">Total</td>';
  totals.forEach(function (t) {
    footHTML += '<td>' + t.toLocaleString() + '</td>';
  });
  footRow.innerHTML = footHTML;
}

function renderPackageTags(packages) {
  var container = document.getElementById('packageTags');
  container.innerHTML = '';
  packages.forEach(function (pkg, i) {
    var color = COLORS[i % COLORS.length];
    var tag = document.createElement('span');
    tag.className = 'package-tag';

    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;

    var label = document.createElement('span');
    label.textContent = pkg;

    var btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.textContent = '\u00d7';
    btn.title = 'Remove';
    btn.addEventListener('click', function () {
      deletePackage(pkg);
    });

    tag.appendChild(dot);
    tag.appendChild(label);
    tag.appendChild(btn);
    container.appendChild(tag);
  });
}

// ========== Download CSV ==========

function downloadCSV() {
  var packages = appData.packages;
  var data = appData.data;

  if (!packages.length) {
    showToast('No data to download', 'error');
    return;
  }

  // Collect weeks (chronological for CSV)
  var allWeeksMap = {};
  packages.forEach(function (pkg) {
    var weeks = (data[pkg] && data[pkg].weeks) || [];
    weeks.forEach(function (w) {
      if (!allWeeksMap[w.start]) {
        allWeeksMap[w.start] = { start: w.start, end: w.end };
      }
    });
  });
  var allWeeks = Object.values(allWeeksMap).sort(function (a, b) {
    return a.start.localeCompare(b.start);
  });

  var weekMaps = packages.map(function (pkg) {
    var map = {};
    var weeks = (data[pkg] && data[pkg].weeks) || [];
    weeks.forEach(function (w) {
      map[w.start] = w.downloads;
    });
    return map;
  });

  var csv = 'Week Start,Week End,' + packages.join(',') + '\n';
  allWeeks.forEach(function (week) {
    var row = [week.start, week.end];
    packages.forEach(function (_, i) {
      row.push(weekMaps[i][week.start] || 0);
    });
    csv += row.join(',') + '\n';
  });

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'npm-weekly-downloads-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded', 'success');
}

// ========== UI Helpers ==========

function showLoading(text) {
  document.getElementById('loadingText').textContent = text || 'Loading...';
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(function () {
    toast.className = 'toast';
  }, 3000);
}

function escapeHTML(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
