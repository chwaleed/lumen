from pathlib import Path

import pytest

from src.compiles.log_parser import (
    SEVERITY_ERROR,
    SEVERITY_WARNING,
    count_errors,
    parse_log,
    unwrap,
)

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / f"{name}.log").read_text(encoding="utf-8", errors="replace")


def errors(name: str, source_dir: Path | None = None):
    return [d for d in parse_log(load(name), source_dir) if d.severity == SEVERITY_ERROR]


def warnings(name: str):
    return [d for d in parse_log(load(name)) if d.severity == SEVERITY_WARNING]


class TestUnwrap:
    def test_rejoins_a_line_tex_split_at_the_margin(self) -> None:
        first = "x" * 79
        assert unwrap(f"{first}\ncontinued") == [f"{first}continued"]

    def test_leaves_short_lines_alone(self) -> None:
        assert unwrap("short\nalso short") == ["short", "also short"]

    def test_an_empty_log_yields_nothing(self) -> None:
        assert unwrap("") == []


class TestLocatedErrors:
    @pytest.mark.parametrize(
        ("fixture", "expected_file", "expected_line", "expected_text"),
        [
            ("undefined_command", "undefined_command.tex", 4, "Undefined control sequence"),
            ("missing_dollar", "missing_dollar.tex", 4, "Missing $ inserted"),
            ("bad_environment", "bad_environment.tex", 6, "ended by"),
            # The hard case: an error inside an \input-ed subfile must be blamed
            # on the subfile, not on main.tex.
            ("nested_error", "sections/bad.tex", 1, "Missing $ inserted"),
        ],
    )
    def test_the_first_error_is_the_real_one(
        self, fixture: str, expected_file: str, expected_line: int, expected_text: str
    ) -> None:
        first = errors(fixture)[0]
        assert first.file == expected_file
        assert first.line == expected_line
        assert expected_text in first.message

    def test_the_wrapped_message_is_rejoined(self) -> None:
        # TeX split this one as "... ended by " / "\end{enumerate}."
        assert "\\end{enumerate}" in errors("bad_environment")[0].message

    def test_a_cascade_from_one_fault_is_deduplicated(self) -> None:
        # One missing `$` logs on several lines; each distinct location is kept
        # once, and the first is still the real one.
        found = errors("missing_dollar")
        assert found[0].line == 4
        assert len(found) == len({(d.file, d.line, d.message) for d in found})


class TestFollowOnSuppression:
    @pytest.mark.parametrize("fixture", ["missing_package", "unbalanced_brace", "missing_dollar"])
    def test_emergency_stop_and_fatal_error_are_never_reported(self, fixture: str) -> None:
        # These are logged wherever TeX gave up, not where the fault is -- and
        # missing_package proves it: the stop is line 3, the real cause line 2.
        messages = " ".join(d.message for d in parse_log(load(fixture)))
        assert "Emergency stop" not in messages
        assert "Fatal error" not in messages

    def test_the_real_error_survives_suppression(self) -> None:
        assert "not found" in errors("missing_package")[0].message


class TestUnlocatedErrors:
    def test_a_missing_package_is_located_from_the_sources(self, tmp_path: Path) -> None:
        # TeX reports l.3 (where it noticed); the \usepackage is on line 2.
        (tmp_path / "missing_package.tex").write_text(
            "\\documentclass{article}\n"
            "\\usepackage{definitelynotarealpackage}\n"
            "\\begin{document}\nHello.\n\\end{document}\n"
        )
        first = errors("missing_package", tmp_path)[0]
        assert first.file == "missing_package.tex"
        assert first.line == 2

    def test_without_sources_it_still_reports_the_message(self) -> None:
        first = errors("missing_package")[0]
        assert "definitelynotarealpackage.sty" in first.message

    def test_an_error_with_no_location_anywhere_recovers_the_file(self) -> None:
        # `! File ended while scanning use of \textbf .` carries neither file nor
        # line; TeX's `<*> <file>` marker supplies the file.
        first = errors("unbalanced_brace")[0]
        assert "File ended while scanning" in first.message
        assert first.file == "unbalanced_brace.tex"

    def test_it_does_not_invent_a_line_it_cannot_know(self) -> None:
        # Honest degradation beats pointing somewhere wrong.
        assert errors("unbalanced_brace")[0].line is None


class TestWarnings:
    def test_undefined_references_and_citations_are_warnings_not_errors(self) -> None:
        assert errors("undefined_reference") == []
        found = warnings("undefined_reference")
        assert any("Reference" in d.message for d in found)
        assert any("Citation" in d.message for d in found)

    def test_a_warning_carries_the_line_it_names(self) -> None:
        reference = next(d for d in warnings("undefined_reference") if "Reference" in d.message)
        assert reference.line == 4

    def test_errors_rank_above_warnings(self) -> None:
        parsed = parse_log(load("missing_dollar"))
        severities = [d.severity for d in parsed]
        if SEVERITY_WARNING in severities and SEVERITY_ERROR in severities:
            assert severities.index(SEVERITY_ERROR) < severities.index(SEVERITY_WARNING)


class TestCleanLog:
    def test_a_successful_build_reports_no_errors(self) -> None:
        assert count_errors(parse_log(load("clean"))) == 0

    def test_an_empty_log_parses_to_nothing(self) -> None:
        assert parse_log("") == []
