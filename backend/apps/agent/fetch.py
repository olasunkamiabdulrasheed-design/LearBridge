"""SSRF-guarded URL fetching for agent research.

Only http/https URLs whose hostnames resolve exclusively to public IPs are
fetched. Content is size-capped and reduced to a short text excerpt — the
excerpt is treated as DATA for evaluation, never as instructions.
"""
import hashlib
import ipaddress
import socket
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urlparse

MAX_BYTES = 1_000_000
EXCERPT_CHARS = 2000


class FetchSkipped(Exception):
    """A single candidate could not be fetched. Never fails the run."""


@dataclass(frozen=True)
class FetchResult:
    title: str
    excerpt: str
    content_hash: str


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list = []
        self._in_title = False
        self.title = ""
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "nav", "footer"):
            self._skip = True
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "nav", "footer"):
            self._skip = False
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        text = data.strip()
        if not text:
            return
        if self._in_title:
            self.title += text + " "
        elif not self._skip:
            self._parts.append(text)

    @property
    def text(self) -> str:
        return " ".join(" ".join(self._parts).split())


def validate_url(url: str) -> str:
    """Return the URL if safe to fetch, else raise FetchSkipped."""
    try:
        parsed = urlparse(url)
    except ValueError as exc:
        raise FetchSkipped(f"Unparseable URL: {exc}") from exc
    if parsed.scheme not in ("http", "https"):
        raise FetchSkipped(f"Blocked scheme: {parsed.scheme or '(none)'}")
    host = parsed.hostname or ""
    if not host:
        raise FetchSkipped("URL has no hostname")
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError as exc:
        raise FetchSkipped(f"DNS resolution failed for {host}") from exc
    ips = {info[4][0] for info in infos}
    for raw in ips:
        try:
            ip = ipaddress.ip_address(raw)
        except ValueError as exc:
            raise FetchSkipped(f"Unparseable resolved IP for {host}") from exc
        if not ip.is_global:
            raise FetchSkipped(f"Blocked non-public address for {host}")
    return url


def fetch_url(url: str, timeout: float = 20.0) -> FetchResult:
    """Fetch and excerpt a URL. Raises FetchSkipped on any problem."""
    validate_url(url)
    try:
        import httpx
    except ImportError as exc:
        raise FetchSkipped("HTTP client unavailable") from exc
    try:
        with httpx.stream(
            "GET", url, timeout=timeout, follow_redirects=True, max_redirects=3,
            headers={"User-Agent": "LearnBridgeAgent/1.0 (hackathon research)"},
        ) as response:
            if response.status_code != 200:
                raise FetchSkipped(f"HTTP {response.status_code}")
            chunks: list = []
            total = 0
            for chunk in response.iter_bytes(chunk_size=65536):
                total += len(chunk)
                if total > MAX_BYTES:
                    break
                chunks.append(chunk)
            raw = b"".join(chunks)
    except FetchSkipped:
        raise
    except Exception as exc:
        raise FetchSkipped(f"Request failed: {type(exc).__name__}") from exc
    content_hash = hashlib.sha256(raw).hexdigest()
    try:
        text = raw.decode("utf-8", errors="replace")
    except Exception as exc:
        raise FetchSkipped("Undecodable content") from exc
    extractor = _TextExtractor()
    try:
        extractor.feed(text[:MAX_BYTES])
    except Exception as exc:
        raise FetchSkipped("Unparseable content") from exc
    title = " ".join(extractor.title.split())[:200]
    excerpt = extractor.text[:EXCERPT_CHARS]
    if not excerpt:
        raise FetchSkipped("No readable text found")
    return FetchResult(title=title or url, excerpt=excerpt, content_hash=content_hash)
