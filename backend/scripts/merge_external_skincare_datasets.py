from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd


INPUT_FILES = {
    "skincare_datasets_xlsx": Path(r"C:\Users\Khaled\Desktop\Skincare dataset\skincare_datasets.xlsx"),
    "skincare_products_5000_csv": Path(r"C:\Users\Khaled\Desktop\Skincare dataset\skincare_products_5000.csv"),
    "skincare_questionnaire_10000_xlsx": Path(
        r"C:\Users\Khaled\Desktop\Skincare dataset\skincare_questionnaire_10000.xlsx"
    ),
    "skincare_recommendations_dataset_csv": Path(
        r"C:\Users\Khaled\Desktop\Skincare dataset\skincare_recommendations_dataset.csv"
    ),
    "skincare_training_starter_pack_xlsx": Path(
        r"C:\Users\Khaled\Desktop\Skincare dataset\skincare_training_starter_pack.xlsx"
    ),
}

OUTPUT_DIR = Path("backend/data/merged")


# Step 1: verifies that every original Excel/CSV file exists before merging starts.
def ensure_inputs_exist() -> None:
    missing = [str(path) for path in INPUT_FILES.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Some input files were not found:\n" + "\n".join(f"- {path}" for path in missing)
        )


# Reads CSV files with a fallback encoding so older dataset exports still load.
def read_csv_flexible(path: Path) -> pd.DataFrame:
    try:
        return pd.read_csv(path)
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="latin1")


# Cleans text values by trimming spaces, handling blanks, and optionally lowercasing.
def clean_string(value: object, *, lower: bool = False) -> object:
    if pd.isna(value):
        return pd.NA
    text = str(value).strip()
    if not text:
        return pd.NA
    return text.lower() if lower else text


# Converts different yes/no formats into one consistent value.
def normalize_yes_no(value: object) -> object:
    text = clean_string(value, lower=True)
    if pd.isna(text):
        return pd.NA
    if text in {"yes", "y", "true", "1"}:
        return "yes"
    if text in {"no", "n", "false", "0"}:
        return "no"
    return text


# Converts skin type names from different datasets into one shared label set.
def normalize_skin_type(value: object) -> object:
    text = clean_string(value, lower=True)
    if pd.isna(text):
        return pd.NA
    mapping = {
        "oily": "oily",
        "oil": "oily",
        "dry": "dry",
        "combination": "combination",
        "combo": "combination",
        "normal": "normal",
        "sensitive": "sensitive",
    }
    return mapping.get(str(text), text)


# Normalizes list-like columns into a deduplicated pipe-separated format.
def normalize_pipe_list(value: object) -> object:
    text = clean_string(value, lower=True)
    if pd.isna(text):
        return pd.NA
    text = str(text).replace("/", "|").replace(",", "|").replace(";", "|")
    parts = [part.strip() for part in text.split("|") if part.strip()]
    deduped: list[str] = []
    for part in parts:
        if part not in deduped:
            deduped.append(part)
    return "|".join(deduped) if deduped else pd.NA


# Adds missing columns so datasets with different schemas can be concatenated safely.
def add_missing_columns(df: pd.DataFrame, expected_columns: Iterable[str]) -> pd.DataFrame:
    for column in expected_columns:
        if column not in df.columns:
            df[column] = pd.NA
    return df


# Builds the main training dataset used to predict skin type and concern levels.
def build_master_questionnaire_prediction() -> pd.DataFrame:
    # Load questionnaire rows from the large questionnaire dataset.
    q10000 = pd.read_excel(
        INPUT_FILES["skincare_questionnaire_10000_xlsx"],
        sheet_name="skincare_questionnaire_10000",
    ).copy()
    q10000["source_dataset"] = "skincare_questionnaire_10000.xlsx::skincare_questionnaire_10000"
    q10000["source_case_id"] = q10000["case_id"]

    # Load skin analysis rows and rename columns to match the training schema.
    analysis = pd.read_excel(INPUT_FILES["skincare_datasets_xlsx"], sheet_name="Skin_Analysis").copy()
    analysis = analysis.rename(
        columns={
            "acne_level": "acne_level_0_5",
            "dryness_level": "dryness_level_0_5",
            "oiliness_level": "oiliness_level_0_5",
            "redness_level": "redness_level_0_5",
            "sensitivity_level": "sensitivity_level_0_5",
            "dehydration_level": "dehydration_level_0_5",
            "mature_skin_level": "mature_skin_level_0_5",
            "dermatologist_referral": "dermatologist_referral_flag",
        }
    )
    analysis["source_dataset"] = "skincare_datasets.xlsx::Skin_Analysis"
    analysis["source_case_id"] = pd.NA
    analysis["dataset_note"] = "from_skin_analysis_sheet"

    # Load starter questionnaire rows and convert q1/q2 fields into clear feature names.
    starter_q = pd.read_excel(
        INPUT_FILES["skincare_training_starter_pack_xlsx"],
        sheet_name="QuestionnaireData",
    ).copy()
    starter_q = starter_q.rename(
        columns={
            "q1": "q1_skin_feel",
            "q2": "q2_breakouts",
            "q3": "q3_sensitivity",
            "q4": "q4_pores",
            "q5": "q5_tightness",
            "q6": "q6_redness",
            "q7": "q7_sun_reaction",
        }
    )
    starter_q["source_dataset"] = "skincare_training_starter_pack.xlsx::QuestionnaireData"
    starter_q["source_case_id"] = starter_q["case_id"]
    starter_q["dataset_note"] = "from_starter_pack_questionnaire"

    # Define one canonical schema so all three sources can become one master CSV.
    canonical_columns = [
        "source_dataset",
        "source_case_id",
        "age_group",
        "fitzpatrick_type",
        "q1_skin_feel",
        "q2_breakouts",
        "q3_sensitivity",
        "q4_pores",
        "q5_tightness",
        "q6_redness",
        "q7_sun_reaction",
        "q8_hydration_status",
        "q9_sleep_quality",
        "q10_stress_level",
        "skin_type",
        "acne_level_0_5",
        "dryness_level_0_5",
        "oiliness_level_0_5",
        "redness_level_0_5",
        "sensitivity_level_0_5",
        "dehydration_level_0_5",
        "mature_skin_level_0_5",
        "dermatologist_referral_flag",
        "dataset_note",
    ]

    # Align all source dataframes to the same columns before concatenation.
    q10000 = add_missing_columns(q10000, canonical_columns)[canonical_columns]
    analysis = add_missing_columns(analysis, canonical_columns)[canonical_columns]
    starter_q = add_missing_columns(starter_q, canonical_columns)[canonical_columns]

    # Merge the sources into one training table.
    master = pd.concat([q10000, analysis, starter_q], ignore_index=True)

    # Clean text feature columns used by the model.
    text_columns = [
        "source_dataset",
        "age_group",
        "fitzpatrick_type",
        "q1_skin_feel",
        "q2_breakouts",
        "q3_sensitivity",
        "q4_pores",
        "q5_tightness",
        "q6_redness",
        "q7_sun_reaction",
        "q8_hydration_status",
        "q9_sleep_quality",
        "q10_stress_level",
        "dataset_note",
    ]
    for column in text_columns:
        master[column] = master[column].map(clean_string)

    # Normalize labels and target values before saving the final master dataset.
    master["skin_type"] = master["skin_type"].map(normalize_skin_type)
    master["dermatologist_referral_flag"] = master["dermatologist_referral_flag"].map(normalize_yes_no)

    numeric_columns = [
        "source_case_id",
        "acne_level_0_5",
        "dryness_level_0_5",
        "oiliness_level_0_5",
        "redness_level_0_5",
        "sensitivity_level_0_5",
        "dehydration_level_0_5",
        "mature_skin_level_0_5",
    ]
    for column in numeric_columns:
        master[column] = pd.to_numeric(master[column], errors="coerce").astype("Int64")

    # Add a stable record id so each generated training row is traceable.
    master.insert(0, "master_record_id", [f"MQP{idx:07d}" for idx in range(1, len(master) + 1)])
    return master


# Builds the recommendation rules dataset used after prediction.
def build_recommendations() -> pd.DataFrame:
    # Load recommendation rules from both Excel and CSV sources.
    rec_from_xlsx = pd.read_excel(INPUT_FILES["skincare_datasets_xlsx"], sheet_name="Recommendations").copy()
    rec_from_xlsx["source_dataset"] = "skincare_datasets.xlsx::Recommendations"

    rec_from_csv = read_csv_flexible(INPUT_FILES["skincare_recommendations_dataset_csv"]).copy()
    rec_from_csv["source_dataset"] = "skincare_recommendations_dataset.csv"

    # Merge sources and standardize concern-level column names.
    combined = pd.concat([rec_from_xlsx, rec_from_csv], ignore_index=True)
    combined = combined.rename(
        columns={
            "acne_level": "acne_level_0_5",
            "dryness_level": "dryness_level_0_5",
            "oiliness_level": "oiliness_level_0_5",
            "sensitivity_level": "sensitivity_level_0_5",
        }
    )

    # Clean skin type, product recommendation text, and numeric concern scores.
    combined["skin_type"] = combined["skin_type"].map(normalize_skin_type)
    for column in [
        "recommended_cleanser",
        "recommended_moisturizer",
        "recommended_serum",
        "recommended_spf",
        "recommended_treatment",
    ]:
        combined[column] = combined[column].map(lambda value: clean_string(value, lower=True))

    for column in ["acne_level_0_5", "dryness_level_0_5", "oiliness_level_0_5", "sensitivity_level_0_5"]:
        combined[column] = pd.to_numeric(combined[column], errors="coerce").astype("Int64")

    dedupe_columns = [
        "skin_type",
        "acne_level_0_5",
        "dryness_level_0_5",
        "oiliness_level_0_5",
        "sensitivity_level_0_5",
        "recommended_cleanser",
        "recommended_moisturizer",
        "recommended_serum",
        "recommended_spf",
        "recommended_treatment",
    ]

    # Group duplicate rules together while keeping source dataset traceability.
    recommendations = (
        combined.groupby(dedupe_columns, dropna=False, as_index=False)["source_dataset"]
        .agg(lambda series: "|".join(sorted(set(str(item) for item in series if pd.notna(item)))))
        .rename(columns={"source_dataset": "source_datasets"})
    )
    recommendations.insert(
        0,
        "recommendation_rule_id",
        [f"REC{idx:07d}" for idx in range(1, len(recommendations) + 1)],
    )
    return recommendations


# Builds the searchable products dataset from product and starter-pack files.
def build_products() -> pd.DataFrame:
    # Load the large product CSV and normalize numeric product fields.
    products_5000 = read_csv_flexible(INPUT_FILES["skincare_products_5000_csv"]).copy()
    products_5000["source_dataset"] = "skincare_products_5000.csv"
    products_5000["source_product_id"] = products_5000["product_id"].map(clean_string)
    products_5000["spf_value"] = pd.to_numeric(products_5000["spf_value"], errors="coerce").astype("Float64")
    products_5000["price_usd"] = pd.to_numeric(products_5000["price_usd"], errors="coerce").astype("Float64")

    # Load starter product rules and reshape them to the same product schema.
    starter_products = pd.read_excel(
        INPUT_FILES["skincare_training_starter_pack_xlsx"],
        sheet_name="ProductsRules",
    ).copy()
    starter_products = starter_products.rename(columns={"recommended_time": "usage_time"})
    starter_products["source_dataset"] = "skincare_training_starter_pack.xlsx::ProductsRules"
    starter_products["source_product_id"] = starter_products["product_id"].map(clean_string)
    starter_products["dermatologist_only"] = pd.NA
    starter_products["spf_value"] = pd.Series([pd.NA] * len(starter_products), dtype="Float64")
    starter_products["price_usd"] = pd.Series([pd.NA] * len(starter_products), dtype="Float64")
    starter_products["dataset_note"] = "from_starter_pack_products_rules"

    # Define the canonical product columns used by the FastAPI product search endpoint.
    canonical_columns = [
        "source_dataset",
        "source_product_id",
        "brand",
        "product_name",
        "category",
        "target_skin_types",
        "target_concerns",
        "key_ingredients",
        "fragrance_free",
        "non_comedogenic",
        "dermatologist_only",
        "usage_time",
        "spf_value",
        "price_usd",
        "dataset_note",
    ]

    # Align, merge, clean, and normalize product records.
    products_5000 = add_missing_columns(products_5000, canonical_columns)[canonical_columns]
    starter_products = add_missing_columns(starter_products, canonical_columns)[canonical_columns]
    products = pd.concat([products_5000, starter_products], ignore_index=True)

    for column in ["brand", "product_name", "category", "usage_time", "dataset_note"]:
        products[column] = products[column].map(clean_string)
    products["key_ingredients"] = products["key_ingredients"].map(lambda value: clean_string(value, lower=True))
    products["target_skin_types"] = products["target_skin_types"].map(normalize_pipe_list)
    products["target_concerns"] = products["target_concerns"].map(normalize_pipe_list)
    products["fragrance_free"] = products["fragrance_free"].map(normalize_yes_no)
    products["non_comedogenic"] = products["non_comedogenic"].map(normalize_yes_no)
    products["dermatologist_only"] = products["dermatologist_only"].map(normalize_yes_no)

    products["spf_value"] = pd.to_numeric(products["spf_value"], errors="coerce")
    products["price_usd"] = pd.to_numeric(products["price_usd"], errors="coerce")

    # Deduplicate equal products while preserving where they came from.
    dedupe_columns = [
        "brand",
        "product_name",
        "category",
        "target_skin_types",
        "target_concerns",
        "key_ingredients",
        "fragrance_free",
        "non_comedogenic",
        "dermatologist_only",
        "usage_time",
        "spf_value",
        "price_usd",
    ]
    aggregation = {
        "source_dataset": lambda series: "|".join(sorted(set(str(item) for item in series if pd.notna(item)))),
        "source_product_id": lambda series: "|".join(sorted(set(str(item) for item in series if pd.notna(item)))),
        "dataset_note": lambda series: "|".join(sorted(set(str(item) for item in series if pd.notna(item)))),
    }
    products = products.groupby(dedupe_columns, as_index=False, dropna=False).agg(aggregation)
    products = products.rename(columns={"source_dataset": "source_datasets"})
    products.insert(0, "product_uid", [f"PRD{idx:07d}" for idx in range(1, len(products) + 1)])
    return products


# Builds AM and PM routine text from the cleaned recommendation rules.
def build_routines(recommendations: pd.DataFrame) -> pd.DataFrame:
    routines = recommendations[
        [
            "recommendation_rule_id",
            "skin_type",
            "acne_level_0_5",
            "dryness_level_0_5",
            "oiliness_level_0_5",
            "sensitivity_level_0_5",
            "recommended_cleanser",
            "recommended_moisturizer",
            "recommended_serum",
            "recommended_spf",
            "recommended_treatment",
            "source_datasets",
        ]
    ].copy()

    routines["am_routine"] = (
        "1) Cleanser: "
        + routines["recommended_cleanser"].fillna("n/a")
        + " | 2) Serum: "
        + routines["recommended_serum"].fillna("n/a")
        + " | 3) Moisturizer: "
        + routines["recommended_moisturizer"].fillna("n/a")
        + " | 4) SPF: "
        + routines["recommended_spf"].fillna("n/a")
    )
    routines["pm_routine"] = (
        "1) Cleanser: "
        + routines["recommended_cleanser"].fillna("n/a")
        + " | 2) Treatment: "
        + routines["recommended_treatment"].fillna("n/a")
        + " | 3) Moisturizer: "
        + routines["recommended_moisturizer"].fillna("n/a")
    )

    routines.insert(0, "routine_id", [f"RTN{idx:07d}" for idx in range(1, len(routines) + 1)])
    return routines


# Runs the full dataset preparation pipeline and writes the merged CSV files.
def run() -> None:
    # Step 1: confirm source files exist and create the output folder.
    ensure_inputs_exist()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Step 2: build each cleaned dataset in memory.
    master_questionnaire = build_master_questionnaire_prediction()
    recommendations = build_recommendations()
    products = build_products()
    routines = build_routines(recommendations)

    # Step 3: choose the output file paths used by FastAPI and model training.
    master_path = OUTPUT_DIR / "master_questionnaire_prediction_dataset.csv"
    recommendations_path = OUTPUT_DIR / "recommendations_dataset.csv"
    products_path = OUTPUT_DIR / "products_dataset.csv"
    routines_path = OUTPUT_DIR / "routines_dataset.csv"

    # Step 4: save the cleaned datasets as CSV files.
    master_questionnaire.to_csv(master_path, index=False)
    recommendations.to_csv(recommendations_path, index=False)
    products.to_csv(products_path, index=False)
    routines.to_csv(routines_path, index=False)

    # Step 5: print row and column counts so training data preparation can be verified.
    print("Merge completed.")
    print(f"- {master_path} (rows={len(master_questionnaire)}, cols={len(master_questionnaire.columns)})")
    print(f"- {recommendations_path} (rows={len(recommendations)}, cols={len(recommendations.columns)})")
    print(f"- {products_path} (rows={len(products)}, cols={len(products.columns)})")
    print(f"- {routines_path} (rows={len(routines)}, cols={len(routines.columns)})")


if __name__ == "__main__":
    run()
