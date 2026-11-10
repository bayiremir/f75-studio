from f75kontrol.ui import App


def main():
    keyboard, error = None, None
    try:
        import keyboard as kb  # type: ignore

        kb.is_pressed("shift")  # fails early on Linux without root
        keyboard = kb
    except ImportError:
        error = "'keyboard' paketi kurulu değil: pip install -r requirements.txt"
    except Exception as exc:  # noqa: BLE001
        error = f"Klavye dinlenemiyor: {exc}"
    App(keyboard, error).mainloop()


if __name__ == "__main__":
    main()
