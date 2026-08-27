"""Build the static UI demo published to GitHub Pages.

Bundles the built frontend (frontend/dist) into a single self-contained
demo-dist/index.html with an XHR shim that answers /api requests with
deterministic simulated market data - no backend, no API keys, sign-in
disabled. Run `npm run build` in frontend/ first.

    python scripts/build_demo.py
"""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist" / "assets"
OUT = ROOT / "demo-dist" / "index.html"

MOCK_JS = r"""
(function () {
  try { history.replaceState(null, "", "/"); } catch (e) {}

  var BASE = { AAPL: 232.4, MSFT: 512.7, GOOGL: 198.2, AMZN: 224.9, NVDA: 178.3, TSLA: 341.6, META: 745.1 };
  var NAMES = { AAPL: "Apple Inc", MSFT: "Microsoft Corp", GOOGL: "Alphabet Inc", AMZN: "Amazon.com Inc", NVDA: "NVIDIA Corp", TSLA: "Tesla Inc", META: "Meta Platforms Inc" };

  function seedOf(s) { var x = 7; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; }

  function quote(sym) {
    var p = BASE[sym] || 100;
    var chg = ((seedOf(sym) % 11) - 5) * p * 0.004;
    return { symbol: sym, current_price: +(p + chg).toFixed(2), change: +chg.toFixed(2),
      percent_change: +((chg / p) * 100).toFixed(2), high: +(p * 1.012).toFixed(2),
      low: +(p * 0.985).toFixed(2), open: +(p * 0.995).toFixed(2), previous_close: p };
  }

  function candles(sym, fromTs, toTs) {
    var outArr = []; var price = (BASE[sym] || 100) * 0.82;
    var x = seedOf(sym) % 2147483648;
    var rnd = function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    for (var t = fromTs; t <= toTs; t += 86400) {
      var d = new Date(t * 1000).getUTCDay();
      if (d === 0 || d === 6) continue;
      var drift = (rnd() - 0.47) * price * 0.02;
      var open = price; price = Math.max(5, price + drift);
      outArr.push({ time: t, open: +open.toFixed(2), close: +price.toFixed(2),
        high: +(Math.max(open, price) * 1.008).toFixed(2), low: +(Math.min(open, price) * 0.992).toFixed(2),
        volume: Math.floor(2e7 + rnd() * 6e7) });
    }
    return outArr;
  }

  var NOW = Math.floor(Date.now() / 1000);
  var NEWS = [
    ["Markets rally as tech earnings beat expectations", "MarketWatch"],
    ["Fed holds rates steady, signals patience on cuts", "Reuters"],
    ["Chipmakers extend gains on strong AI infrastructure demand", "Bloomberg"],
    ["Apple unveils services expansion, shares edge higher", "CNBC"],
    ["Energy stocks slip as oil retreats from monthly highs", "Financial Times"]
  ].map(function (row, i) {
    return { id: i + 1, category: "business", headline: row[0], source: row[1],
      summary: "Demo article - this preview uses simulated market data.",
      url: "https://example.com", image: "", datetime: NOW - i * 5400 };
  });

  function iso(daysAgo) { return new Date(Date.now() - daysAgo * 86400000).toISOString(); }
  function insiders(sym) {
    var execs = ["J. Rivera (CEO)", "M. Chen (CFO)", "A. Osei (Director)", "K. Tanaka (COO)", "L. Novak (Director)"];
    var p = BASE[sym] || 100; var rows = [];
    for (var i = 0; i < 8; i++) {
      var buy = (seedOf(sym + i) % 3) === 0;
      rows.push({ symbol: sym, filing_date: iso(3 + i * 9), transaction_date: iso(5 + i * 9),
        name: execs[i % execs.length], share: 12000 - i * 900,
        change: (buy ? 1 : -1) * (2500 - i * 130), transaction_code: buy ? "P" : "S",
        transaction_price: +(p * (0.9 + 0.01 * i)).toFixed(2) });
    }
    return rows;
  }
  function ownership(sym) {
    var funds = ["Vanguard Group", "BlackRock", "State Street", "Fidelity (FMR)", "T. Rowe Price"];
    return funds.map(function (f, i) {
      return { symbol: sym, report_date: iso(30 + i * 2), investor_name: f,
        share: 90000000 - i * 12000000, change: (i % 2 ? -1 : 1) * (1200000 - i * 150000), filing_date: iso(20 + i * 2) };
    });
  }

  function route(method, url) {
    var u = new URL(url, location.origin);
    var p = u.pathname; var m;
    if (p === "/api/stocks/trending") return [200, { symbols: Object.keys(BASE).slice(0, 6) }];
    if (p === "/api/stocks/market/news") return [200, { news: NEWS }];
    if (p === "/api/stocks/search") {
      var q = (u.searchParams.get("q") || "").toUpperCase();
      var results = Object.keys(BASE).filter(function (s) {
        return s.indexOf(q) >= 0 || NAMES[s].toUpperCase().indexOf(q) >= 0;
      }).map(function (s) { return { symbol: s, description: NAMES[s], type: "Common Stock" }; });
      return [200, { results: results }];
    }
    if (p === "/api/stocks/quotes") {
      var syms = (u.searchParams.get("symbols") || "").split(",").filter(Boolean);
      var qs = {}; syms.forEach(function (s) { qs[s] = quote(s); });
      return [200, { quotes: qs }];
    }
    if ((m = p.match(/^\/api\/stocks\/([A-Z.]+)\/quote$/))) return [200, quote(m[1])];
    if ((m = p.match(/^\/api\/stocks\/([A-Z.]+)\/candles$/))) {
      var f = parseInt(u.searchParams.get("from_ts") || "0", 10);
      var t2 = parseInt(u.searchParams.get("to_ts") || "0", 10);
      return [200, { candles: candles(m[1], f, t2) }];
    }
    if ((m = p.match(/^\/api\/stocks\/([A-Z.]+)\/news$/))) return [200, { news: NEWS.slice(0, 3) }];
    if ((m = p.match(/^\/api\/stocks\/([A-Z.]+)\/profile$/))) {
      var s2 = m[1];
      return [200, { symbol: s2, name: NAMES[s2] || s2, exchange: "NASDAQ", industry: "Technology",
        logo: "", market_cap: 2400000, share_outstanding: 15200, website: "https://example.com" }];
    }
    if ((m = p.match(/^\/api\/insiders\/([A-Z.]+)\/transactions$/))) return [200, insiders(m[1])];
    if ((m = p.match(/^\/api\/insiders\/([A-Z.]+)\/ownership$/))) return [200, ownership(m[1])];
    if (p === "/api/chat/" && method === "POST") {
      return [200, { answer: "This is the static demo, so I can't reach OpenAI - but in the real app I answer stock questions with live quotes, news, and your portfolio data via tool calls. Try the search bar or the Compare page to explore the simulated data." }];
    }
    if (p.indexOf("/api/watchlists") === 0 || p.indexOf("/api/portfolios") === 0 || p === "/api/insiders/feed/me")
      return [401, { detail: "Missing bearer token" }];
    return [404, { detail: "Not found in demo" }];
  }

  var RealXHR = window.XMLHttpRequest;
  function DemoXHR() {
    this.readyState = 0; this.status = 0; this.statusText = "";
    this.responseType = ""; this.timeout = 0; this.withCredentials = false;
    this._listeners = {};
  }
  DemoXHR.prototype.open = function (method, url) {
    this._method = (method || "GET").toUpperCase(); this._url = String(url);
    this._mock = this._url.indexOf("/api") === 0 || this._url.indexOf(location.origin + "/api") === 0;
    if (!this._mock) {
      this._real = new RealXHR();
      this._real.open(method, url, true);
    }
    this.readyState = 1;
  };
  DemoXHR.prototype.setRequestHeader = function (k, v) { if (this._real) this._real.setRequestHeader(k, v); };
  DemoXHR.prototype.getAllResponseHeaders = function () {
    if (this._mock) return "content-type: application/json\r\n";
    return this._real ? this._real.getAllResponseHeaders() : "";
  };
  DemoXHR.prototype.getResponseHeader = function (k) {
    if (this._mock) return /content-type/i.test(k) ? "application/json" : null;
    return this._real ? this._real.getResponseHeader(k) : null;
  };
  DemoXHR.prototype.addEventListener = function (t, fn) { this._listeners[t] = fn; if (this._real) this._real.addEventListener(t, fn); };
  DemoXHR.prototype.removeEventListener = function (t) { delete this._listeners[t]; };
  DemoXHR.prototype.abort = function () { if (this._real) this._real.abort(); };
  DemoXHR.prototype.send = function (body) {
    var self = this;
    if (!this._mock) {
      var real = this._real;
      ["onload", "onerror", "onloadend", "onreadystatechange", "ontimeout", "onabort"].forEach(function (h) {
        if (self[h]) real[h] = function () {
          self.readyState = real.readyState; self.status = real.status;
          self.statusText = real.statusText; self.response = real.response;
          try { self.responseText = real.responseText; } catch (e) {}
          self[h]();
        };
      });
      real.timeout = self.timeout; real.withCredentials = self.withCredentials;
      try { real.responseType = self.responseType; } catch (e) {}
      real.send(body);
      return;
    }
    setTimeout(function () {
      var res = route(self._method, self._url, body);
      self.status = res[0]; self.statusText = res[0] === 200 ? "OK" : "Error";
      var text = JSON.stringify(res[1]);
      self.response = self.responseType === "json" ? res[1] : text;
      self.responseText = text;
      self.readyState = 4; self.responseURL = self._url;
      if (self.onreadystatechange) self.onreadystatechange();
      if (self.onload) self.onload();
      if (self.onloadend) self.onloadend();
      if (self._listeners.load) self._listeners.load();
      if (self._listeners.loadend) self._listeners.loadend();
    }, 100 + Math.random() * 250);
  };
  window.XMLHttpRequest = DemoXHR;
})();
"""

BANNER = (
    '<div id="demo-banner">Interactive demo &mdash; market data is simulated and '
    "sign-in is disabled in this preview. The real app connects to Finnhub, "
    "OpenAI, and Supabase. "
    '<a href="https://github.com/yang-githubb/stock-planner">View source</a></div>'
)

BANNER_CSS = """
#demo-banner {
  background: #eef2ff; color: #3730a3; border-bottom: 1px solid #c7d2fe;
  font: 13px/1.5 system-ui, 'Segoe UI', Roboto, sans-serif;
  padding: 6px 16px; text-align: center;
}
#demo-banner a { color: inherit; }
@media (prefers-color-scheme: dark) {
  #demo-banner { background: #1e1b4b; color: #c7d2fe; border-bottom-color: #312e81; }
}
"""


def main() -> None:
    js_files = sorted(DIST.glob("index-*.js"))
    css_files = sorted(DIST.glob("index-*.css"))
    if not js_files or not css_files:
        raise SystemExit("frontend/dist not found - run `npm run build` in frontend/ first")
    js = js_files[0].read_text(encoding="utf-8")
    css = css_files[0].read_text(encoding="utf-8")
    if "</script" in js:
        raise SystemExit("bundle contains '</script' - add escaping before inlining")

    html = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>StockPlanner Demo</title>\n"
        f"<style>{BANNER_CSS}</style>\n<style>{css}</style>\n"
        f"<script>{MOCK_JS}</script>\n</head>\n<body>\n"
        f"{BANNER}\n<div id=\"root\"></div>\n"
        f'<script type="module">{js}</script>\n</body>\n</html>\n'
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT} ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
