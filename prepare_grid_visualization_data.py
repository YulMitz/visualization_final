#!/usr/bin/env python3
"""
Prepare grid visualization data with age groups and ZIP codes
Extends prepare_wealth_data.py to add geographic and age information
"""

import sys
import importlib.util

# Import functions from prepare_wealth_data.py
spec = importlib.util.spec_from_file_location("prepare_wealth_data", "prepare_wealth_data.py")
pwd_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pwd_module)

import pandas as pd
import numpy as np
import json
from pathlib import Path
from collections import defaultdict

# Reuse configurations from prepare_wealth_data
DATA_PATH = pwd_module.DATA_PATH
OUTPUT_PATH = pwd_module.OUTPUT_PATH
FILE_MAPPING = pwd_module.FILE_MAPPING
VAR_CONFIG = pwd_module.VAR_CONFIG
SUBJECTIVE_CLASSES = pwd_module.SUBJECTIVE_CLASSES
OBJECTIVE_CLASSES = pwd_module.OBJECTIVE_CLASSES

# Age bins: 0-14, 15-24, 25-34, 35-44, 45-54, 55-64, 65+
AGE_BINS = [0, 15, 25, 35, 45, 55, 65, 101]
AGE_LABELS = ['0-14歲', '15-24歲', '25-34歲', '35-44歲', '45-54歲', '55-64歲', '65歲以上']


def calculate_age_2017(row):
    """Calculate age for 2017 data"""
    # Try birth year/month first
    a2y = row.get('a2y')
    a2m = row.get('a2m')

    if pd.notna(a2y) and a2y > 0:
        birth_year = int(a2y) + 1911  # ROC year to AD
        return 2017 - birth_year

    # Fall back to approximate age
    a2a = row.get('a2a')
    if pd.notna(a2a) and a2a > 0:
        return int(a2a)

    return np.nan


def calculate_age_2022(row):
    """Calculate age for 2022 data"""
    # Try birth year/month first
    a2y = row.get('a2y')
    a2m = row.get('a2m')

    if pd.notna(a2y) and a2y > 0:
        birth_year = int(a2y) + 1911  # ROC year to AD
        return 2022 - birth_year

    # Fall back to approximate age
    a2r = row.get('a2r')
    if pd.notna(a2r) and a2r > 0:
        return int(a2r)

    return np.nan


def get_age(row, year):
    """Get age from row based on year-specific logic"""
    if year == 2017:
        return calculate_age_2017(row)
    elif year == 2022:
        return calculate_age_2022(row)
    else:
        # Most years have 'age' variable
        age_var = 'age' if year != 2012 else 'v2r_3'
        age = row.get(age_var)
        if pd.notna(age) and age > 0:
            return int(age)
    return np.nan


def process_year_for_grid(year):
    """Process year data to include age groups and ZIP codes"""
    print(f"\n{'=' * 60}")
    print(f"Processing {year} for grid visualization")
    print(f"{'=' * 60}")

    # Load data using existing function
    df, meta = pwd_module.load_data(year)
    config = VAR_CONFIG[year]

    # Get age
    df['age'] = df.apply(lambda row: get_age(row, year), axis=1)

    # Bin age into groups
    df['age_group'] = pd.cut(df['age'], bins=AGE_BINS, labels=AGE_LABELS, right=False)

    # Get ZIP code
    zip_var = config.get('zip', 'zip')
    df['zip_code'] = df[zip_var]

    # Get subjective wealth class
    df['subjective_class'] = df.apply(
        lambda row: pwd_module.get_subjective_class(row, year, meta),
        axis=1
    )

    # Get objective wealth class
    df['annual_income'] = df.apply(
        lambda row: pwd_module.get_household_income(row, year, config),
        axis=1
    )
    df['objective_class'] = df['annual_income'].apply(
        lambda x: pwd_module.classify_objective_wealth(x, year)
    )

    # Filter valid records
    df_valid = df[
        df['age_group'].notna() &
        df['zip_code'].notna() &
        (df['subjective_class'].notna() | df['objective_class'].notna())
    ].copy()

    print(f"Valid records: {len(df_valid)} / {len(df)} ({len(df_valid)/len(df)*100:.1f}%)")

    # Get ZIP code to region name mapping from metadata
    zip_var = config.get('zip', 'zip')
    zip_to_region = meta.variable_value_labels.get(zip_var, {})

    # Aggregate data by ZIP code, age group, and wealth
    records_by_zip = defaultdict(lambda: {
        'region_name': None,
        'subjective': defaultdict(lambda: defaultdict(int)),
        'objective': defaultdict(lambda: defaultdict(int))
    })

    for _, row in df_valid.iterrows():
        zip_code = str(int(row['zip_code']))
        age_group = row['age_group']

        # Store region name
        if records_by_zip[zip_code]['region_name'] is None:
            records_by_zip[zip_code]['region_name'] = zip_to_region.get(int(row['zip_code']), '未知地區')

        # Count subjective wealth
        if pd.notna(row['subjective_class']):
            subj_class = row['subjective_class']
            records_by_zip[zip_code]['subjective'][age_group][subj_class] += 1

        # Count objective wealth
        if pd.notna(row['objective_class']):
            obj_class = row['objective_class']
            records_by_zip[zip_code]['objective'][age_group][obj_class] += 1

    # Convert to JSON-friendly format
    output_data = {
        'year': year,
        'total_samples': len(df_valid),
        'zip_codes': {}
    }

    for zip_code, data in records_by_zip.items():
        zip_data = {
            'zip': zip_code,
            'region': data['region_name'],
            'subjective': {},
            'objective': {}
        }

        # Convert subjective wealth data
        for age_group in AGE_LABELS:
            if age_group in data['subjective']:
                zip_data['subjective'][age_group] = dict(data['subjective'][age_group])

        # Convert objective wealth data
        for age_group in AGE_LABELS:
            if age_group in data['objective']:
                zip_data['objective'][age_group] = dict(data['objective'][age_group])

        output_data['zip_codes'][zip_code] = zip_data

    # Save to JSON
    output_file = OUTPUT_PATH / f'grid_viz_data_{year}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved to {output_file}")
    print(f"  ZIP codes with data: {len(output_data['zip_codes'])}")

    return output_data


def main():
    print("=" * 60)
    print("Grid Visualization Data Preparation")
    print("=" * 60)

    all_results = {}

    for year in [1992, 1997, 2002, 2007, 2012, 2017, 2022]:
        try:
            result = process_year_for_grid(year)
            all_results[year] = result
        except Exception as e:
            print(f"✗ Error processing {year}: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    for year, result in all_results.items():
        print(f"{year}: {result['total_samples']} samples, {len(result['zip_codes'])} ZIP codes")

    print("\n✓ Grid visualization data preparation complete!")


if __name__ == '__main__':
    main()
