import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Aula Control — unofficial AULA F75 app")
    parser.add_argument("--tray", action="store_true", help="Start hidden (used by Start with Windows)")
    parser.add_argument("--version", action="store_true")
    args = parser.parse_args(argv)
    if args.version:
        from aula_control import __version__

        print(__version__)
        return 0
    from aula_control.ui import run_app

    run_app(start_tray=args.tray)
    return 0


if __name__ == "__main__":
    sys.exit(main())
