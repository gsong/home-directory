#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "click",
# ]
# ///

import csv
from datetime import datetime

import click


def transform_csv(input_file: str, output_file: str, date: str) -> None:
    """Transform a CSV file by filtering dates and restructuring columns."""
    filter_date = datetime.strptime(date, "%Y-%m-%d")

    with open(input_file, "r") as f:
        rows = list(csv.DictReader(f))

    transformed = []
    for row in rows:
        if datetime.strptime(row["Date"], "%m/%d/%Y") >= filter_date:
            amount = (row.get("Credits(+)") or row.get("Debits(-)")).replace(" ", "").replace("$", "")
            transformed.append({"Date": row["Date"], "Payee": row["Description"], "Amount": amount})

    fieldnames = ["Date", "Payee", "Amount"]
    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(transformed)


@click.command()
@click.argument("input_file", type=click.Path(exists=True))
@click.argument("output_file", type=click.Path())
@click.option(
    "--date",
    "-d",
    required=True,
    help="Filter transactions from this date (YYYY-MM-DD)",
)
def main(input_file: str, output_file: str, date: str):
    """Transform EverBank CSV exports for import into Simplifi.

    INPUT_FILE: Path to the EverBank CSV export file
    OUTPUT_FILE: Path where the transformed CSV should be saved
    """
    try:
        transform_csv(input_file, output_file, date)
        click.echo(f"Successfully transformed {input_file} to {output_file}")
    except Exception as e:
        click.echo(f"Error: {str(e)}", err=True)
        raise click.Abort()


if __name__ == "__main__":
    main()
