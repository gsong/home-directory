#!/usr/bin/env python
import csv
import os
import sys


def transform_csv(input_file: str) -> None:
    base_name = os.path.splitext(input_file)[0]
    output_file = f"{base_name}-simplifi.csv"

    with open(input_file, mode="r") as infile:
        reader = csv.DictReader(infile)
        transactions = list(reader)

    with open(output_file, mode="w", newline="") as outfile:
        fieldnames = ["Date", "Payee", "Amount", "Tags"]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)

        writer.writeheader()

        for transaction in transactions:
            date = transaction["Date"]
            description = transaction["Description"]
            debits = transaction["Debits(-)"]
            credits = transaction["Credits(+)"]

            if debits:
                amount = debits.replace("$", "").replace(",", "")
            else:
                amount = credits.replace("$", "").replace(",", "")

            writer.writerow(
                {
                    "Date": date,
                    "Payee": description,
                    "Amount": amount,
                    "Tags": "",  # Leave Tags empty
                }
            )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <input_csv_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    transform_csv(input_file)
    print(f"Transformed CSV saved as '{os.path.splitext(input_file)[0]}-simplifi.csv'")
