#!/usr/bin/env python3
"""
Taiwan Social Change Survey - Wealth Data Preparation (Version 2)
Processes all 7 years (1992-2022) of TSCS data for visualization.
Correctly handles categorical income codes vs. actual amounts.
"""

import pandas as pd
import numpy as np
import pyreadstat
import json
from pathlib import Path
from collections import defaultdict

# Data path
DATA_PATH = Path('/home/mulkooo/visualization/vi_data')
OUTPUT_PATH = Path('./data/processed')

# Create output directory if it doesn't exist
OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

# Income quintile thresholds (annual household income in NT$)
INCOME_THRESHOLDS = {
    1992: [235752, 423392, 560466, 742466, 1236408],
    1997: [312458, 557429, 753919, 1003815, 1689517],
    2002: [292113, 538584, 743888, 1005274, 1799733],
    2007: [312145, 571128, 799418, 1069885, 1866791],
    2012: [301362, 566814, 810075, 1093553, 1846116],
    2017: [338278, 627855, 884183, 1191537, 2052850],
    2022: [364876, 672906, 954383, 1306283, 2244401]
}

# File mapping
FILE_MAPPING = {
    1992: 'tscs921.sav',
    1997: 'tscs971_l.sav',
    2002: 'tscs021.sav',
    2007: 'tscs071.sav',
    2012: 'tscs121.sav',
    2017: 'tscs171.sav',
    2022: 'tscs221.sav'
}

# Variable configurations per year
VAR_CONFIG = {
    1992: {
        'subjective': 'v65a',
        'income_vars': ['v80', 'v81'],
        'zip': 'zip',
        'year': 'year',
        'gender': 'v1',
        'happiness': None
    },
    1997: {
        'subjective': 'v89a',
        'income_vars': ['v101b'],
        'zip': 'zip',
        'year': 'year',
        'gender': 'v1',
        'happiness': 'v94a'
    },
    2002: {
        'subjective': 'v126',
        'subjective_aux': 'v125',
        'income_vars': ['v146b'],
        'zip': 'zip',
        'year': 'year',
        'gender': 'v1',
        'happiness': 'v138'
    },
    2007: {
        'subjective': 'f5',
        'income_vars': ['h45'],
        'zip': 'zip',
        'year': 'year',
        'gender': 'a1',
        'happiness': 'g1'
    },
    2012: {
        'subjective': 'v94',
        'income_vars': ['v108'],
        'zip': 'zip',
        'year': 'year',
        'gender': 'v1',
        'happiness': 'v104'
    },
    2017: {
        'subjective': 'e2',
        'income_vars': ['f7'] + [f'c40{str(i).zfill(2)}n' for i in range(1, 24)],
        'zip': 'zip',
        'year': 'year',
        'gender': 'a1',
        'happiness': 'f4'
    },
    2022: {
        'subjective': 'e2',
        'income_vars': ['f14'],
        'zip': 'zipr',
        'year': 'year',
        'gender': 'a1',
        'happiness': 'f9'
    }
}

# Objective wealth categories (5 levels)
OBJECTIVE_CLASSES = ['低', '中低', '中等', '中高', '高']

# Subjective wealth categories (6 levels)
SUBJECTIVE_CLASSES = ['下層階級', '勞工階級', '中下層階級', '中層階級', '中上層階級', '上層階級']


def load_data(year):
    """Load SPSS data for a given year."""
    file_path = DATA_PATH / FILE_MAPPING[year]
    print(f"  Loading {file_path.name}...")
    df, meta = pyreadstat.read_sav(str(file_path))
    print(f"  Loaded {len(df)} records with {len(df.columns)} variables")
    return df, meta


def classify_objective_wealth(annual_income, year):
    """
    Classify household income into 5 quintile categories.
    Returns: '低', '中低', '中等', '中高', '高' or None
    """
    if pd.isna(annual_income) or annual_income <= 0:
        return None

    thresholds = INCOME_THRESHOLDS[year]

    if annual_income < thresholds[0]:
        return '低'
    elif annual_income < thresholds[1]:
        return '中低'
    elif annual_income < thresholds[2]:
        return '中等'
    elif annual_income < thresholds[3]:
        return '中高'
    else:
        return '高'


def convert_income_code_to_monthly(code, year):
    """
    Convert categorical income code to estimated monthly amount (midpoint of range).
    Returns monthly income in NT$ or None.
    """
    if pd.isna(code) or code >= 90:
        return None

    code = int(code)

    if year == 1992:
        # v80/v81 income ranges
        ranges = {
            1: 0,       # 無收入
            2: 5000,    # 1萬元以下 → 5千
            3: 15000,   # 1-2萬元 → 1.5萬
            4: 25000,   # 2-3萬元
            5: 35000,   # 3-4萬元
            6: 45000,   # 4-5萬元
            7: 55000,   # 5-6萬元
            8: 65000,   # 6-7萬元
            9: 75000,   # 7-8萬元
            10: 85000,  # 8-9萬元
            11: 95000,  # 9-10萬元
            12: 105000, # 10-11萬元
            13: 115000, # 11-12萬元
            14: 125000, # 12-13萬元
            15: 135000, # 13-14萬元
            16: 145000, # 14-15萬元
            17: 155000, # 15-16萬元
            18: 165000, # 16-17萬元
            19: 175000, # 17-18萬元
            20: 185000, # 18-19萬元
            21: 195000, # 19-20萬元
            22: 250000  # 20萬元以上 → 25萬估計
        }
        return ranges.get(code)

    elif year == 1997:
        ranges = {
            1: 0, 2: 10000, 3: 30000, 4: 50000, 5: 70000, 6: 90000,
            7: 110000, 8: 130000, 9: 150000, 10: 170000, 11: 190000,
            12: 210000, 13: 230000, 14: 250000, 15: 270000, 16: 290000,
            17: 310000, 18: 330000, 19: 350000, 20: 370000, 21: 390000,
            22: 450000
        }
        return ranges.get(code)

    elif year == 2002:
        # v146b household income ranges
        ranges = {
            1: 0, 2: 5000, 3: 15000, 4: 25000, 5: 35000, 6: 45000,
            7: 55000, 8: 65000, 9: 75000, 10: 85000, 11: 95000, 12: 105000,
            13: 115000, 14: 125000, 15: 135000, 16: 145000, 17: 155000,
            18: 165000, 19: 175000, 20: 185000, 21: 195000, 22: 225000,
            23: 275000, 24: 325000, 25: 375000, 26: 425000, 27: 475000,
            28: 550000, 29: 650000, 30: 750000, 31: 850000, 32: 950000,
            33: 1200000  # 100萬以上
        }
        return ranges.get(code)

    elif year == 2007:
        # h45 household income ranges
        ranges = {
            1: 0, 2: 5000, 3: 15000, 4: 25000, 5: 35000, 6: 45000,
            7: 55000, 8: 65000, 9: 75000, 10: 85000, 11: 95000, 12: 105000,
            13: 115000, 14: 125000, 15: 135000, 16: 145000, 17: 155000,
            18: 165000, 19: 175000, 20: 185000, 21: 195000, 22: 225000,
            23: 275000, 24: 325000, 25: 375000, 26: 700000,  # 40-100萬
            27: 1200000  # 100萬以上
        }
        return ranges.get(code)

    elif year == 2012:
        # v108 household income ranges
        ranges = {
            1: 0, 2: 5000, 3: 15000, 4: 25000, 5: 35000, 6: 45000,
            7: 55000, 8: 65000, 9: 75000, 10: 85000, 11: 95000, 12: 105000,
            13: 115000, 14: 125000, 15: 135000, 16: 145000, 17: 155000,
            18: 165000, 19: 175000, 20: 185000, 21: 195000, 22: 250000,
            23: 350000, 24: 450000, 25: 750000, 26: 1200000  # 100萬以上
        }
        return ranges.get(code)

    elif year == 2017:
        # f7 uses similar encoding to 2022
        ranges = {
            1: 0, 2: 5000, 3: 15000, 4: 25000, 5: 35000, 6: 45000,
            7: 55000, 8: 65000, 9: 75000, 10: 85000, 11: 95000, 12: 105000,
            13: 115000, 14: 125000, 15: 135000, 16: 145000, 17: 155000,
            18: 165000, 19: 175000, 20: 185000, 21: 195000, 22: 250000,
            23: 350000, 24: 450000, 25: 750000, 26: 1500000
        }
        return ranges.get(code)

    elif year == 2022:
        ranges = {
            1: 0, 2: 5000, 3: 15000, 4: 25000, 5: 35000, 6: 45000,
            7: 55000, 8: 65000, 9: 75000, 10: 85000, 11: 95000, 12: 105000,
            13: 115000, 14: 125000, 15: 135000, 16: 145000, 17: 155000,
            18: 165000, 19: 175000, 20: 185000, 21: 195000, 22: 250000,
            23: 350000, 24: 450000, 25: 750000, 26: 1500000
        }
        return ranges.get(code)

    return None


def get_household_income(row, year, config):
    """
    Extract household income from row based on year-specific logic.
    Returns annual income in NT$.
    """
    if year == 1992:
        # 1992: Convert income codes to amounts, sum personal income
        v80 = row.get('v80', np.nan)
        v81 = row.get('v81', np.nan)

        monthly_income = 0

        # Convert v80 code to amount
        v80_monthly = convert_income_code_to_monthly(v80, year)
        if v80_monthly is not None:
            monthly_income += v80_monthly

        # Convert v81 code to amount
        v81_monthly = convert_income_code_to_monthly(v81, year)
        if v81_monthly is not None:
            monthly_income += v81_monthly

        if monthly_income > 0:
            return monthly_income * 12
        return np.nan

    elif year == 1997:
        v101b = row.get('v101b', np.nan)
        monthly = convert_income_code_to_monthly(v101b, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    elif year == 2002:
        # Categorical income codes (household monthly)
        v146b = row.get('v146b', np.nan)
        monthly = convert_income_code_to_monthly(v146b, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    elif year == 2007:
        # Categorical income codes (household monthly)
        h45 = row.get('h45', np.nan)
        monthly = convert_income_code_to_monthly(h45, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    elif year == 2012:
        # Categorical income codes (household monthly)
        v108 = row.get('v108', np.nan)
        monthly = convert_income_code_to_monthly(v108, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    elif year == 2017:
        # Use household income (f7) only
        f7 = row.get('f7', np.nan)
        monthly = convert_income_code_to_monthly(f7, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    elif year == 2022:
        f14 = row.get('f14', np.nan)
        monthly = convert_income_code_to_monthly(f14, year)
        if monthly is not None and monthly > 0:
            return monthly * 12
        return np.nan

    return np.nan


def get_subjective_class(row, year, meta):
    """Extract subjective wealth class from row."""
    config = VAR_CONFIG[year]
    var_name = config['subjective']
    value = row.get(var_name, np.nan)

    if pd.isna(value):
        return None

    value_labels = meta.variable_value_labels.get(var_name, {})
    label = value_labels.get(value, None)

    if label and any(x in label for x in ['不知道', '拒答', '跳答', '漏答', '無意見', '無反應']):
        return None

    if year == 2002:
        v126 = row.get('v126', np.nan)
        v125 = row.get('v125', np.nan)
        if not pd.isna(v126) and not pd.isna(v125):
            v126_label = meta.variable_value_labels.get('v126', {}).get(v126, '')
            v125_label = meta.variable_value_labels.get('v125', {}).get(v125, '')
            if '中下' in v126_label and ('工' in v125_label or '農民' in v125_label):
                return '勞工階級'

    if label:
        if '上層' in label and '中上' not in label:
            return '上層階級'
        elif '中上' in label:
            return '中上層階級'
        elif '中層' in label and '中上' not in label and '中下' not in label:
            return '中層階級'
        elif '中下' in label:
            return '中下層階級'
        elif '勞工' in label:
            return '勞工階級'
        elif '下層' in label:
            return '下層階級'

    return None


def get_happiness(row, year, meta):
    """Extract happiness/satisfaction score."""
    config = VAR_CONFIG[year]
    happiness_var = config.get('happiness')

    if not happiness_var:
        return None

    value = row.get(happiness_var, np.nan)

    if pd.isna(value):
        return None

    if value >= 90:
        return None

    return float(value)


def should_exclude_1992_housewife(row, annual_income):
    """Check if 1992 record should be excluded."""
    gender = row.get('v1', np.nan)
    if not pd.isna(gender) and gender == 2:
        if not pd.isna(annual_income) and annual_income < 117876:
            return True
    return False


def process_year(year):
    """Process data for a single year."""
    print(f"\n{'='*60}")
    print(f"Processing {year}")
    print(f"{'='*60}")

    df, meta = load_data(year)
    config = VAR_CONFIG[year]

    records = []
    excluded_count = 0
    missing_subjective = 0
    missing_objective = 0

    for idx, row in df.iterrows():
        annual_income = get_household_income(row, year, config)

        if year == 1992 and should_exclude_1992_housewife(row, annual_income):
            excluded_count += 1
            continue

        objective_class = classify_objective_wealth(annual_income, year)
        subjective_class = get_subjective_class(row, year, meta)
        happiness = get_happiness(row, year, meta)

        zip_var = config['zip']
        zip_code = row.get(zip_var, np.nan)
        if pd.isna(zip_code):
            zip_code = None
        else:
            zip_code = int(zip_code)

        if subjective_class is None:
            missing_subjective += 1
        if objective_class is None:
            missing_objective += 1

        if subjective_class and objective_class:
            records.append({
                'subjective': subjective_class,
                'objective': objective_class,
                'happiness': happiness,
                'zip': zip_code
            })

    print(f"\n  Statistics:")
    print(f"    Total records: {len(df)}")
    print(f"    Valid records: {len(records)}")
    print(f"    Excluded (1992 housewives): {excluded_count}")
    print(f"    Missing subjective: {missing_subjective}")
    print(f"    Missing objective: {missing_objective}")

    return records


def generate_sankey_data(records, year):
    """Generate Sankey diagram data structure."""
    flow_counts = defaultdict(int)

    for record in records:
        key = (record['subjective'], record['objective'])
        flow_counts[key] += 1

    subjective_nodes = sorted(set(r['subjective'] for r in records),
                             key=lambda x: SUBJECTIVE_CLASSES.index(x))
    objective_nodes = sorted(set(r['objective'] for r in records),
                            key=lambda x: OBJECTIVE_CLASSES.index(x))

    links = []
    for (subj, obj), count in flow_counts.items():
        links.append({
            'source': subj,
            'target': obj,
            'value': count
        })

    subjective_counts = defaultdict(int)
    objective_counts = defaultdict(int)

    for record in records:
        subjective_counts[record['subjective']] += 1
        objective_counts[record['objective']] += 1

    return {
        'year': year,
        'total_samples': len(records),
        'nodes': {
            'subjective': subjective_nodes,
            'objective': objective_nodes
        },
        'links': links,
        'summary': {
            'by_subjective': dict(subjective_counts),
            'by_objective': dict(objective_counts)
        }
    }


def calculate_wealth_scores(records):
    """Calculate average wealth scores for comparison chart."""
    subjective_scores = []
    objective_scores = []
    happiness_scores = []

    for record in records:
        subj_idx = SUBJECTIVE_CLASSES.index(record['subjective'])
        subj_score = subj_idx / (len(SUBJECTIVE_CLASSES) - 1)
        subjective_scores.append(subj_score)

        obj_idx = OBJECTIVE_CLASSES.index(record['objective'])
        obj_score = obj_idx / (len(OBJECTIVE_CLASSES) - 1)
        objective_scores.append(obj_score)

        if record['happiness'] is not None:
            happiness_scores.append(record['happiness'])

    return {
        'subjective_avg': np.mean(subjective_scores) if subjective_scores else None,
        'objective_avg': np.mean(objective_scores) if objective_scores else None,
        'happiness_avg': np.mean(happiness_scores) if happiness_scores else None,
        'happiness_std': np.std(happiness_scores) if happiness_scores else None
    }


def main():
    """Main processing function."""
    print("\n" + "="*60)
    print("Taiwan Social Change Survey - Wealth Data Preparation v2")
    print("Processing 1992-2022 (7 survey waves)")
    print("="*60)

    all_records = {}
    comparison_data = {
        'years': [],
        'subjective_avg': [],
        'objective_avg': [],
        'happiness_avg': [],
        'happiness_std': []
    }

    years = [1992, 1997, 2002, 2007, 2012, 2017, 2022]

    for year in years:
        try:
            records = process_year(year)
            all_records[year] = records

            sankey_data = generate_sankey_data(records, year)
            output_file = OUTPUT_PATH / f'wealth_data_{year}.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(sankey_data, f, ensure_ascii=False, indent=2)
            print(f"  ✓ Saved: {output_file}")

            scores = calculate_wealth_scores(records)
            comparison_data['years'].append(year)
            comparison_data['subjective_avg'].append(scores['subjective_avg'])
            comparison_data['objective_avg'].append(scores['objective_avg'])
            comparison_data['happiness_avg'].append(scores['happiness_avg'])
            comparison_data['happiness_std'].append(scores['happiness_std'])

        except Exception as e:
            print(f"  ✗ Error processing {year}: {e}")
            import traceback
            traceback.print_exc()

    comparison_file = OUTPUT_PATH / 'comparison_data.json'
    with open(comparison_file, 'w', encoding='utf-8') as f:
        json.dump(comparison_data, f, ensure_ascii=False, indent=2)
    print(f"\n✓ Saved comparison data: {comparison_file}")

    print("\n" + "="*60)
    print("Processing Complete - Summary")
    print("="*60)
    for year in years:
        if year in all_records:
            count = len(all_records[year])
            print(f"  {year}: {count:,} valid records")

    print(f"\nOutput files saved to: {OUTPUT_PATH}")


if __name__ == '__main__':
    main()
