from src.compiles.worker import _count_errors


class TestCountErrors:
    def test_counts_file_line_errors(self) -> None:
        log = "./main.tex:4: Missing $ inserted.\n./sections/bad.tex:1: Undefined control sequence.\n"
        assert _count_errors(log) == 2

    def test_counts_errors_with_no_location(self) -> None:
        assert _count_errors("! File ended while scanning use of \\textbf .\n") == 1

    def test_ignores_ordinary_log_noise(self) -> None:
        log = (
            "This is pdfTeX, Version 3.141592653\n"
            "(/usr/local/texlive/2026/texmf-dist/tex/latex/base/article.cls)\n"
            "Output written on main.pdf (2 pages, 125743 bytes).\n"
        )
        assert _count_errors(log) == 0

    def test_a_clean_log_counts_zero(self) -> None:
        assert _count_errors("") == 0
