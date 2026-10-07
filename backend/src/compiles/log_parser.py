"""Turn a (La)TeX log into ranked, located diagnostics.

The agent's effectiveness is bounded by this file: a parser that reports the
wrong line sends it to fix the wrong thing, which is worse than no help at all.
See docs/plans/latex-compilation.md (M5) for the corpus this was built against.

Assumes the engine ran with `-file-line-error`, which turns most errors into
`file:line: message`. The hard cases are the ones that carry no location.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

# TeX hard-wraps the log at max_print_line (79 by default), splitting messages
# mid-word. Unwrapping first is what makes every pattern below reliable.
MAX_PRINT_LINE = 79

SEVERITY_ERROR = "error"
SEVERITY_WARNING = "warning"

_FILE_LINE = re.compile(r"^(?P<file>[^\s:][^:]*?):(?P<line>\d+):\s*(?P<message>.*)$")
_BANG = re.compile(r"^!\s+(?P<message>.*)$")
_WARNING = re.compile(
    r"^(?:(?P<kind>LaTeX|Package|Class)\s*(?P<package>[\w@-]*)\s*)?"
    r"(?P<severity>Warning|Info):\s*(?P<message>.*)$"
)
_BADBOX = re.compile(
    r"^(?P<kind>Overfull|Underfull)\s+\\(?P<box>[hv]box)\s*\((?P<detail>[^)]*)\)"
    r".*?(?:at lines?|in paragraph at lines?)\s+(?P<line>\d+)"
)
_ON_INPUT_LINE = re.compile(r"on input line (?P<line>\d+)")
_TEX_LINE_MARKER = re.compile(r"^l\.(?P<line>\d+)")
_CURRENT_FILE = re.compile(r"^<\*>\s+(?P<file>\S+)")
_FILE_NOT_FOUND = re.compile(r"File `(?P<name>[^']+)' not found")

# Lines that follow a real error rather than being one. Reporting these is how a
# parser ends up pointing at the wrong line: `Emergency stop` is logged against
# wherever TeX gave up, not where the fault is.
_FOLLOW_ON = re.compile(
    r"^(Emergency stop|==>\s*Fatal error|\s*==>\s*Fatal error"
    r"|Type X to quit|or enter new name|Try typing|I have stopped)"
)

_LOOKAHEAD = 12


@dataclass
class Diagnostic:
    severity: str
    message: str
    file: str | None = None
    line: int | None = None
    # Not part of equality: two reports of the same fault are the same fault.
    raw: str = field(default="", compare=False)

    def as_dict(self) -> dict:
        return {
            "severity": self.severity,
            "message": self.message,
            "file": self.file,
            "line": self.line,
        }


def unwrap(log_text: str) -> list[str]:
    """Rejoin lines TeX split at max_print_line."""
    out: list[str] = []
    continuing = False
    for raw in log_text.splitlines():
        if continuing and out:
            out[-1] += raw
        else:
            out.append(raw)
        # The flag comes from the chunk TeX just emitted, not from the joined
        # length: once a rejoined line passes the margin it would otherwise
        # swallow the rest of the log.
        continuing = len(raw) == MAX_PRINT_LINE
    return out


def _normalise_file(name: str) -> str:
    return name[2:] if name.startswith("./") else name


def _recover_location(lines: list[str], index: int) -> tuple[str | None, int | None]:
    """Find a file and line for an error that reported neither.

    TeX usually prints `l.<N>` with the line it had reached, and `<*> <file>`
    with the file it was reading. Neither is guaranteed and `l.<N>` is only
    approximate, so both are treated as hints.
    """
    found_file: str | None = None
    found_line: int | None = None
    for candidate in lines[index + 1 : index + 1 + _LOOKAHEAD]:
        if found_line is None:
            marker = _TEX_LINE_MARKER.match(candidate)
            if marker:
                found_line = int(marker.group("line"))
        if found_file is None:
            current = _CURRENT_FILE.match(candidate)
            if current:
                found_file = _normalise_file(current.group("file"))
        if found_file and found_line:
            break
    return found_file, found_line


def _find_in_sources(source_dir: Path, needle: str) -> tuple[str | None, int | None]:
    """Locate the line that asks for a missing file.

    `! LaTeX Error: File 'x.sty' not found` carries no location, and TeX's own
    `l.<N>` points at wherever it noticed rather than at the \\usepackage.
    """
    stem = Path(needle).stem
    wanted = ("usepackage", "documentclass", "RequirePackage", "input", "include",
              "includegraphics", "addbibresource", "bibliography")
    for source in sorted(source_dir.rglob("*.tex")):
        try:
            text = source.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for number, line in enumerate(text.splitlines(), start=1):
            if stem in line and any(key in line for key in wanted):
                return str(source.relative_to(source_dir)), number
    return None, None


def parse_log(log_text: str, source_dir: Path | None = None) -> list[Diagnostic]:
    """Parse a log into deduplicated diagnostics, the real error first."""
    lines = unwrap(log_text)
    diagnostics: list[Diagnostic] = []

    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        match = _FILE_LINE.match(line)
        if match and not line.startswith("(") and not line.startswith("!"):
            message = match.group("message").strip()
            # Suppress the aftermath; it is logged where TeX gave up.
            if not message or _FOLLOW_ON.match(message):
                continue
            inner = _WARNING.match(message)
            severity = (
                SEVERITY_WARNING
                if inner and inner.group("severity") == "Warning"
                else SEVERITY_ERROR
            )
            if inner and inner.group("severity") == "Info":
                continue
            diagnostics.append(
                Diagnostic(
                    severity=severity,
                    message=message,
                    file=_normalise_file(match.group("file")),
                    line=int(match.group("line")),
                    raw=line,
                )
            )
            continue

        bang = _BANG.match(line)
        if bang:
            message = bang.group("message").strip()
            if not message or _FOLLOW_ON.match(message):
                continue
            file_name, line_number = _recover_location(lines, index)
            missing = _FILE_NOT_FOUND.search(message)
            if missing and source_dir is not None:
                found_file, found_line = _find_in_sources(source_dir, missing.group("name"))
                if found_line is not None:
                    file_name, line_number = found_file, found_line
            diagnostics.append(
                Diagnostic(
                    severity=SEVERITY_ERROR,
                    message=message,
                    file=file_name,
                    line=line_number,
                    raw=line,
                )
            )
            continue

        badbox = _BADBOX.match(stripped)
        if badbox:
            diagnostics.append(
                Diagnostic(
                    severity=SEVERITY_WARNING,
                    message=(
                        f"{badbox.group('kind')} \\{badbox.group('box')} "
                        f"({badbox.group('detail')})"
                    ),
                    file=None,
                    line=int(badbox.group("line")),
                    raw=stripped,
                )
            )
            continue

        warning = _WARNING.match(stripped)
        if warning and warning.group("severity") == "Warning":
            message = warning.group("message").strip()
            if not message:
                continue
            at_line = _ON_INPUT_LINE.search(message)
            diagnostics.append(
                Diagnostic(
                    severity=SEVERITY_WARNING,
                    message=message,
                    file=None,
                    line=int(at_line.group("line")) if at_line else None,
                    raw=stripped,
                )
            )

    return _rank(_deduplicate(diagnostics))


def _deduplicate(diagnostics: list[Diagnostic]) -> list[Diagnostic]:
    """One fault, one entry. A single missing `$` can log a dozen times."""
    seen: set[tuple] = set()
    out: list[Diagnostic] = []
    for diagnostic in diagnostics:
        key = (diagnostic.severity, diagnostic.file, diagnostic.line, diagnostic.message[:60])
        if key in seen:
            continue
        seen.add(key)
        out.append(diagnostic)
    return out


def _rank(diagnostics: list[Diagnostic]) -> list[Diagnostic]:
    """Errors before warnings, otherwise the order TeX reported them.

    Document order is deliberate: after follow-ons are suppressed, the first
    error TeX printed is the one that actually broke the build.
    """
    errors = [d for d in diagnostics if d.severity == SEVERITY_ERROR]
    warnings = [d for d in diagnostics if d.severity == SEVERITY_WARNING]
    return errors + warnings


def count_errors(diagnostics: list[Diagnostic]) -> int:
    return sum(1 for d in diagnostics if d.severity == SEVERITY_ERROR)
