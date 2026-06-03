"""
cli.py — Command-line interface for the Reimmaschine rhyme dictionary.

Subcommands:
    rhymes    — find rhymes for a word
    word      — inspect all DB entries for a word
    update    — update a single field for a word entry
    reprocess — re-run IPA pipeline for a word
    report    — show data-quality report
    issues    — list individual problematic entries

Usage examples:
    python cli.py rhymes "Armut" --source de --target de en fr --sort purity --limit 20
    python cli.py rhymes "Schönheit" --source de --target de --pattern 10 --syllables 2
    python cli.py word "Armut" --lang de
    python cli.py update "Armut" --lang de --pos noun --field ipa --value "ˈaʁmuːt"
    python cli.py reprocess "Armut" --lang de
    python cli.py report
    python cli.py report --lang de
    python cli.py issues --lang de --filter no_rhyme_part --limit 50

Requires:
    DATABASE_URL environment variable (or a .env file in the working directory).
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import asdict
from typing import Any

# Fix UTF-8 output on Windows (IPA and special characters)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env file if python-dotenv is installed and a .env file is present.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

import rhyme_engine as engine
from rhyme_engine import (
    RhymeResult,
    find_data_issues,
    find_issues_list,
    find_rhymes,
    get_word_data,
    reprocess_ipa,
    update_word_field,
)

console = Console()

# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

_NULL_STYLE = "bold red"
_HIGHLIGHT_STYLE = "bold cyan"


def _fmt_nullable(value: Any, style: str = _NULL_STYLE) -> Text:
    """
    Return a rich Text object representing *value*.
    NULL / None values are rendered in red to make them immediately visible.
    """
    if value is None:
        return Text("NULL", style=style)
    return Text(str(value))


def _truncate(s: str, max_len: int = 40) -> str:
    """Truncate *s* to *max_len* characters, appending '…' if cut."""
    if len(s) <= max_len:
        return s
    return s[: max_len - 1] + "…"


def _first_definition(defs: list[str]) -> str:
    """Return first non-empty definition, truncated to 40 chars."""
    for d in defs:
        stripped = d.strip()
        if stripped:
            return _truncate(stripped, 40)
    return ""

# ---------------------------------------------------------------------------
# Subcommand: rhymes
# ---------------------------------------------------------------------------

def cmd_rhymes(args: argparse.Namespace) -> None:
    """Execute the 'rhymes' subcommand and print a rich table of results."""
    target_langs: list[str] = args.target or [args.source]

    result = find_rhymes(
        word=args.word,
        source_lang=args.source,
        target_langs=target_langs,
        sort_mode=args.sort,
        meter=args.meter,
        stress_pattern=args.pattern,
        syllable_count=args.syllables,
        min_frequency=args.min_freq,
        include_multiword=args.multiword,
        include_rare=args.rare,
        limit=args.limit,
    )

    query = result["query"]
    meta = result["meta"]
    results: list[RhymeResult] = result["results"]

    # ---- Header panel -------------------------------------------------------
    header_lines = [
        f"[bold]Word:[/bold]       {query['word']}  ([cyan]{query['source_lang']}[/cyan])",
        f"[bold]IPA:[/bold]        {query['ipa'] or '[red]N/A[/red]'}",
        f"[bold]Rhyme part:[/bold] {query['rhyme_part'] or '[red]NULL[/red]'}",
        f"[bold]Targets:[/bold]    {', '.join(target_langs)}",
        f"[bold]Sort mode:[/bold]  {args.sort}   "
        f"[bold]Threshold:[/bold] {meta['threshold_used']}   "
        f"[bold]eSpeak:[/bold] {'yes' if meta['espeak_used'] else 'no'}",
    ]
    console.print(Panel("\n".join(header_lines), title="Rhyme Search", expand=False))

    if not results:
        console.print("[yellow]No rhymes found.[/yellow]")
        return

    # ---- Results table -------------------------------------------------------
    table = Table(
        box=box.ROUNDED,
        show_header=True,
        header_style="bold magenta",
        row_styles=["", "dim"],
    )
    table.add_column("#",         style="dim",       width=4,  justify="right")
    table.add_column("Word",      style="bold",      min_width=12)
    table.add_column("Lang",      width=6)
    table.add_column("IPA",       min_width=10)
    table.add_column("Rhyme",     min_width=6)
    table.add_column("Purity",    width=7,  justify="right")
    table.add_column("Freq",      width=9,  justify="right")
    table.add_column("Score",     width=7,  justify="right")
    table.add_column("Syl",       width=4,  justify="right")
    table.add_column("Meter",     width=11)
    table.add_column("POS",       width=8)
    table.add_column("Definition",min_width=20)

    for rank, r in enumerate(results, 1):
        table.add_row(
            str(rank),
            r.word,
            r.language,
            r.ipa or "",
            r.rhyme_part,
            f"{r.purity_score:.3f}",
            f"{r.frequency_score:.2e}",
            f"{r.combined_score:.3f}",
            str(r.syllable_count) if r.syllable_count else "",
            r.meter or "",
            r.pos,
            _first_definition(r.definitions),
        )

    console.print(table)
    console.print(
        f"[dim]Showing {len(results)} of {meta['total_found']} results.[/dim]"
    )

# ---------------------------------------------------------------------------
# Subcommand: word
# ---------------------------------------------------------------------------

def cmd_word(args: argparse.Namespace) -> None:
    """Execute the 'word' subcommand and print a rich Panel per POS entry."""
    rows = get_word_data(args.word, args.lang)

    if not rows:
        console.print(
            f"[yellow]No entries found for '{args.word}' ({args.lang}).[/yellow]"
        )
        return

    for row in rows:
        lines: list[str] = []
        for key, value in row.items():
            if key == "raw_kaikki":
                # Summarise raw_kaikki instead of dumping the full JSON blob.
                lines.append(f"[bold]raw_kaikki:[/bold]  [dim](JSON blob present)[/dim]")
                continue
            if value is None:
                lines.append(f"[bold]{key}:[/bold]  [bold red]NULL[/bold red]")
            else:
                lines.append(f"[bold]{key}:[/bold]  {value}")

        pos_label = row.get("pos") or "?"
        console.print(
            Panel(
                "\n".join(lines),
                title=f"{args.word} / {args.lang} / {pos_label}",
                expand=False,
            )
        )

# ---------------------------------------------------------------------------
# Subcommand: update
# ---------------------------------------------------------------------------

def cmd_update(args: argparse.Namespace) -> None:
    """Execute the 'update' subcommand with a before/after confirmation prompt."""
    rows = get_word_data(args.word, args.lang)
    target_row: dict[str, Any] | None = None
    for row in rows:
        if row.get("pos") == args.pos:
            target_row = row
            break

    if target_row is None:
        console.print(
            f"[red]No entry found for '{args.word}' ({args.lang}, pos={args.pos}).[/red]"
        )
        sys.exit(1)

    current = target_row.get(args.field)
    console.print(Panel(
        f"[bold]Word:[/bold]    {args.word}  ({args.lang}, {args.pos})\n"
        f"[bold]Field:[/bold]   {args.field}\n"
        f"[bold]Current:[/bold] {current!r}\n"
        f"[bold]New:[/bold]     {args.value!r}",
        title="Proposed Update",
        expand=False,
    ))

    answer = console.input("[yellow]Confirm update? [y/N]: [/yellow]").strip().lower()
    if answer != "y":
        console.print("[dim]Update cancelled.[/dim]")
        return

    updated = update_word_field(args.word, args.lang, args.pos, args.field, args.value)
    if updated:
        console.print(f"[green]Updated successfully.[/green]")
        if args.field == "ipa":
            console.print(
                "[dim]rhyme_part, stress_pattern, meter, syllable_count "
                "were recomputed automatically.[/dim]"
            )
    else:
        console.print("[red]Update failed — row not found.[/red]")
        sys.exit(1)

# ---------------------------------------------------------------------------
# Subcommand: reprocess
# ---------------------------------------------------------------------------

def cmd_reprocess(args: argparse.Namespace) -> None:
    """Execute the 'reprocess' subcommand and print a before/after diff table."""
    result = reprocess_ipa(args.word, args.lang, pos=args.pos)

    console.print(Panel(
        f"[bold]Word:[/bold] {result['word']}  ({result['lang']})\n"
        f"[bold]Rows updated:[/bold] {result['rows_updated']}",
        title="IPA Reprocess",
        expand=False,
    ))

    table = Table(box=box.SIMPLE, header_style="bold magenta")
    table.add_column("POS",            width=10)
    table.add_column("Field",          width=16)
    table.add_column("Before",         min_width=16)
    table.add_column("After",          min_width=16)
    table.add_column("Changed",        width=8)

    fields = ["ipa", "rhyme_part", "stress_pattern", "meter", "syllable_count"]
    for detail in result["details"]:
        for f in fields:
            before_val = detail["before"].get(f)
            after_val  = detail["after"].get(f)
            changed    = before_val != after_val
            table.add_row(
                detail["pos"] or "",
                f,
                str(before_val) if before_val is not None else "[red]NULL[/red]",
                str(after_val)  if after_val  is not None else "[red]NULL[/red]",
                "[green]yes[/green]" if changed else "[dim]no[/dim]",
            )

    console.print(table)

# ---------------------------------------------------------------------------
# Subcommand: report
# ---------------------------------------------------------------------------

def cmd_report(args: argparse.Namespace) -> None:
    """Execute the 'report' subcommand and print data-quality tables."""
    report = find_data_issues(lang_filter=args.lang)

    # ---- Coverage table -------------------------------------------------------
    cov_table = Table(
        title="Language Coverage",
        box=box.ROUNDED,
        header_style="bold magenta",
    )
    cov_table.add_column("Language",     width=12)
    cov_table.add_column("Total words",  justify="right", width=13)
    cov_table.add_column("With IPA",     justify="right", width=10)
    cov_table.add_column("Coverage %",   justify="right", width=12)

    for r in report["totals"]:
        cov_pct = r["coverage_pct"]
        pct_str = f"{cov_pct:.1f}%" if cov_pct is not None else "N/A"
        style = "" if (cov_pct or 0) >= 80 else "yellow"
        cov_table.add_row(
            r["language"], str(r["total"]), str(r["with_ipa"]),
            Text(pct_str, style=style),
        )
    console.print(cov_table)

    # ---- Null rhyme_part ------------------------------------------------------
    _print_issue_table(
        report["null_rhyme_part"],
        title="Words with NULL rhyme_part",
        style="red",
    )

    # ---- No IPA source --------------------------------------------------------
    _print_issue_table(
        report["no_ipa_source"],
        title="Words with ipa_source = 'none'",
        style="yellow",
    )

    # ---- Inconsistent stress --------------------------------------------------
    _print_issue_table(
        report["inconsistent_stress"],
        title="syllable_count=1 but stress_pattern ≠ '1'",
        style="yellow",
    )

    # ---- Impossible meter -----------------------------------------------------
    _print_issue_table(
        report["impossible_meter"],
        title="meter IS NOT NULL but syllable_count = 1",
        style="yellow",
    )


def _print_issue_table(rows: list[dict], title: str, style: str = "") -> None:
    """Helper: print a two-column language/count table."""
    if not rows:
        console.print(f"[green]✓ {title}: none[/green]")
        return

    t = Table(title=title, box=box.SIMPLE, header_style="bold magenta")
    t.add_column("Language", width=12)
    t.add_column("Count", justify="right", width=10)
    for r in rows:
        t.add_row(
            Text(r["language"], style=style),
            Text(str(r["count"]), style=style),
        )
    console.print(t)

# ---------------------------------------------------------------------------
# Subcommand: issues
# ---------------------------------------------------------------------------

def cmd_issues(args: argparse.Namespace) -> None:
    """Execute the 'issues' subcommand and print a paginated table."""
    rows = find_issues_list(
        lang=args.lang,
        issue_filter=args.filter,
        limit=args.limit,
    )

    if not rows:
        console.print("[green]No issues found matching the criteria.[/green]")
        return

    filter_label = args.filter or "all"
    lang_label   = args.lang   or "all languages"
    title = f"Issues: {filter_label}  ({lang_label}, limit={args.limit})"

    table = Table(title=title, box=box.ROUNDED, header_style="bold magenta")
    table.add_column("Word",           min_width=14)
    table.add_column("Lang",           width=6)
    table.add_column("POS",            width=8)
    table.add_column("IPA",            min_width=14)
    table.add_column("Rhyme Part",     min_width=8)
    table.add_column("Stress",         width=8)
    table.add_column("Meter",          width=11)
    table.add_column("Syl",            width=4, justify="right")
    table.add_column("Freq",           width=9, justify="right")

    for r in rows:
        table.add_row(
            r["word"],
            r["language"],
            r["pos"] or "",
            r["ipa"] or Text("NULL", style=_NULL_STYLE),
            r["rhyme_part"] or Text("NULL", style=_NULL_STYLE),
            r["stress_pattern"] or Text("NULL", style=_NULL_STYLE),
            r["meter"] or "",
            str(r["syllable_count"]) if r["syllable_count"] is not None else "",
            f"{r['frequency_score']:.2e}" if r["frequency_score"] is not None else "",
        )

    console.print(table)
    console.print(f"[dim]{len(rows)} rows shown.[/dim]")

# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    """Build and return the top-level argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Reimmaschine — cross-language rhyme dictionary CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ---- rhymes ---------------------------------------------------------------
    p_rhymes = sub.add_parser("rhymes", help="Find rhymes for a word")
    p_rhymes.add_argument("word", help="Word to find rhymes for")
    p_rhymes.add_argument("--source", "-s", required=True, metavar="LANG",
                          help="Source language code (e.g. de)")
    p_rhymes.add_argument("--target", "-t", nargs="+", metavar="LANG",
                          help="Target language codes (default: same as source)")
    p_rhymes.add_argument("--sort", choices=["purity", "usefulness", "balanced"],
                          default="balanced", help="Ranking strategy (default: balanced)")
    p_rhymes.add_argument("--meter", metavar="METER",
                          help="Filter by meter name (e.g. trochee)")
    p_rhymes.add_argument("--pattern", metavar="PATTERN",
                          help="Filter by stress pattern string (e.g. 10)")
    p_rhymes.add_argument("--syllables", type=int, metavar="N",
                          help="Filter by syllable count")
    p_rhymes.add_argument("--min-freq", type=float, metavar="F",
                          help="Minimum frequency score (disables auto-relaxation)")
    p_rhymes.add_argument("--limit", type=int, default=50, metavar="N",
                          help="Maximum results (default: 50)")
    p_rhymes.add_argument("--multiword", action="store_true",
                          help="Include multi-word expressions")
    p_rhymes.add_argument("--rare", action="store_true",
                          help="Include ghost words (frequency_score = 0)")

    # ---- word -----------------------------------------------------------------
    p_word = sub.add_parser("word", help="Inspect all DB fields for a word")
    p_word.add_argument("word", help="Word to inspect")
    p_word.add_argument("--lang", "-l", required=True, metavar="LANG",
                        help="Language code")

    # ---- update ---------------------------------------------------------------
    p_update = sub.add_parser("update", help="Update a single field for a word entry")
    p_update.add_argument("word", help="Word to update")
    p_update.add_argument("--lang", "-l", required=True, metavar="LANG")
    p_update.add_argument("--pos", required=True, metavar="POS",
                          help="Part-of-speech entry to target (e.g. noun)")
    p_update.add_argument("--field", required=True, metavar="FIELD",
                          help="Column name to update")
    p_update.add_argument("--value", required=True, metavar="VALUE",
                          help="New value (string; JSON accepted for JSONB fields)")

    # ---- reprocess ------------------------------------------------------------
    p_repr = sub.add_parser("reprocess", help="Re-run IPA pipeline for a word")
    p_repr.add_argument("word", help="Word to reprocess")
    p_repr.add_argument("--lang", "-l", required=True, metavar="LANG")
    p_repr.add_argument("--pos", default=None, metavar="POS",
                        help="Limit to this POS (default: all)")

    # ---- report ---------------------------------------------------------------
    p_rep = sub.add_parser("report", help="Show data-quality report")
    p_rep.add_argument("--lang", "-l", default=None, metavar="LANG",
                       help="Restrict to this language (default: all)")

    # ---- issues ---------------------------------------------------------------
    p_issues = sub.add_parser("issues", help="List problematic word entries")
    p_issues.add_argument("--lang", "-l", default=None, metavar="LANG",
                          help="Restrict to this language")
    p_issues.add_argument(
        "--filter",
        choices=["no_rhyme_part", "no_ipa", "inconsistent_stress", "impossible_meter"],
        default=None,
        help="Issue type to filter by",
    )
    p_issues.add_argument("--limit", type=int, default=50, metavar="N",
                          help="Maximum rows to show (default: 50)")

    return parser

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

_DISPATCH = {
    "rhymes":    cmd_rhymes,
    "word":      cmd_word,
    "update":    cmd_update,
    "reprocess": cmd_reprocess,
    "report":    cmd_report,
    "issues":    cmd_issues,
}


def main() -> None:
    """Parse arguments and dispatch to the appropriate subcommand handler."""
    parser = build_parser()
    args = parser.parse_args()

    handler = _DISPATCH.get(args.command)
    if handler is None:
        parser.print_help()
        sys.exit(1)

    try:
        handler(args)
    except KeyboardInterrupt:
        console.print("\n[dim]Interrupted.[/dim]")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        console.print(f"[bold red]Error:[/bold red] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
