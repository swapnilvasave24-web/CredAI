"""
Downloads the REAL Home Credit Default Risk dataset from Kaggle.

Requires:
  pip install kaggle
  ~/.kaggle/kaggle.json with your API credentials (chmod 600)
  You must have accepted the competition rules on kaggle.com first.

This sandbox environment has no internet access to kaggle.com, so this
script cannot be executed here -- run it on your own machine. See
data/README.md for full instructions. Once run, `prepare_data.py` will
prefer these real files over the synthetic generator automatically.
"""
import subprocess
import sys
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"
COMPETITION = "home-credit-default-risk"

REQUIRED_FILES = [
    "application_train.csv",
    "application_test.csv",
    "bureau.csv",
    "bureau_balance.csv",
    "previous_application.csv",
    "POS_CASH_balance.csv",
    "credit_card_balance.csv",
    "installments_payments.csv",
    "HomeCredit_columns_description.csv",
]


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("Install the Kaggle CLI first: pip install kaggle")
        sys.exit(1)

    print(f"Downloading competition files for '{COMPETITION}' into {RAW_DIR} ...")
    subprocess.run(
        ["kaggle", "competitions", "download", "-c", COMPETITION, "-p", str(RAW_DIR)],
        check=True,
    )
    # unzip
    for zf in RAW_DIR.glob("*.zip"):
        subprocess.run(["unzip", "-o", str(zf), "-d", str(RAW_DIR)], check=True)

    missing = [f for f in REQUIRED_FILES if not (RAW_DIR / f).exists()]
    if missing:
        print(f"WARNING: missing expected files after download: {missing}")
    else:
        print("All expected Home Credit files are present in data/raw/.")


if __name__ == "__main__":
    main()
