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
    """
    Transform a CSV file by filtering dates and restructuring columns.

    Args:
        input_file (str): Path to input CSV file
        output_file (str): Path to output CSV file
        date (str): Date string in YYYY-MM-DD format to filter from
    """
    # Convert filter date to datetime object
    filter_date = datetime.strptime(date, "%Y-%m-%d")

    # Read input CSV
    def read_input_csv():
        with open(input_file, "r") as f:
            reader = csv.DictReader(f)
            return list(reader)

    # Filter rows by date
    def filter_by_date(rows):
        filtered_rows = []
        for row in rows:
            row_date = datetime.strptime(row["Date"], "%m/%d/%Y")
            if row_date >= filter_date:
                filtered_rows.append(row)
        return filtered_rows

    # Transform row data (combine amounts, rename columns)
    def transform_row(row):
        amount = row.get("Credits(+)") or row.get("Debits(-)")
        # Remove any extra spaces, $ symbols, and ensure single $ is removed
        amount = amount.replace(" ", "").replace("$", "")

        return {"Date": row["Date"], "Payee": row["Description"], "Amount": amount}

    # Write output CSV
    def write_output_csv(transformed_data):
        fieldnames = ["Date", "Payee", "Amount"]
        with open(output_file, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(transformed_data)

    # Main transformation logic
    input_data = read_input_csv()
    filtered_data = filter_by_date(input_data)
    transformed_data = [transform_row(row) for row in filtered_data]
    write_output_csv(transformed_data)


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
