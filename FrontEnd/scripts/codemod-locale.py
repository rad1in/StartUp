"""One-off codemod: replace hardcoded fa-IR formatting with the locale-aware
helpers from useLanguage() (n / date / dateShort).

Why a backward scanner instead of a regex: the receiver of .toLocaleString can
be an arbitrary expression with nesting — `Math.max(a, b)`, `(x || []).length`,
`Number(item.price)`. A naive regex silently mangles those (it turned
`Math.max(0, x).toLocaleString('fa-IR')` into `Math.maxn(0, x)`), so we walk
backwards from the call and track bracket depth to find the true start.

Usage: python scripts/codemod-locale.py <file> [<file> ...]
Always review `git diff` afterwards — this rewrites code.
"""
import sys
import pathlib

CALLS = [
    (".toLocaleDateString('fa-IR')", "dateShort"),
    (".toLocaleTimeString('fa-IR')", "timeShort"),
    (".toLocaleString('fa-IR')", None),  # n() or date(), decided by receiver
]


def find_expr_start(s: str, end: int) -> int:
    """Index where the receiver expression ending at `end` (exclusive) starts."""
    i = end - 1
    depth = 0
    while i >= 0:
        c = s[i]
        if c in ')]':
            depth += 1
        elif c in '([':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0 and not (c.isalnum() or c in '_$.'):
            break
        i -= 1
    return i + 1


def convert(src: str) -> tuple[str, int]:
    changes = 0
    for call, forced in CALLS:
        while True:
            idx = src.find(call)
            if idx == -1:
                break
            start = find_expr_start(src, idx)
            # `new Date(x)` — the scanner stops at the `new` keyword (it isn't
            # part of the expression grammar we walk), so pull it in explicitly.
            head = src[:start].rstrip()
            if head.endswith('new'):
                start = len(head) - 3
            receiver = src[start:idx]

            is_date = receiver.startswith('new Date(')
            helper = forced if forced else ('date' if is_date else 'n')
            # date()/dateShort() already do `new Date(value)` internally, so
            # unwrap to avoid the redundant double construction.
            arg = receiver[len('new Date('):-1] if is_date and receiver.endswith(')') else receiver

            src = src[:start] + f'{helper}({arg})' + src[idx + len(call):]
            changes += 1
    return src, changes


def main() -> None:
    total = 0
    for arg in sys.argv[1:]:
        p = pathlib.Path(arg)
        original = p.read_text(encoding='utf-8')
        updated, changes = convert(original)
        if changes:
            p.write_text(updated, encoding='utf-8')
            total += changes
            print(f'{changes:3d}  {arg}')
    print(f'--- {total} call sites rewritten ---')


if __name__ == '__main__':
    main()
