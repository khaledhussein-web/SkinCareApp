from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


FEATURE_COLUMNS = [
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
]

TARGET_LEVEL_COLUMNS = [
    "acne_level_0_5",
    "dryness_level_0_5",
    "oiliness_level_0_5",
    "redness_level_0_5",
    "sensitivity_level_0_5",
    "dehydration_level_0_5",
    "mature_skin_level_0_5",
]


def normalize_skin_type(value: Any) -> str:
    text = str(value or "").strip().lower()
    mapping = {
        "normal": "normal",
        "dry": "dry",
        "oily": "oily",
        "combination": "combination",
        "combo": "combination",
        "sensitive": "sensitive",
        "acne-prone": "oily",
        "dehydrated": "dry",
        "mature": "normal",
    }
    return mapping.get(text, text)


def _prepare_master_frame(master_df: pd.DataFrame) -> pd.DataFrame:
    df = master_df.copy()
    for column in FEATURE_COLUMNS:
        if column not in df.columns:
            df[column] = "unknown"
        df[column] = df[column].fillna("unknown").astype(str).str.strip().replace("", "unknown")

    if "skin_type" not in df.columns:
        raise ValueError("Master dataset must include 'skin_type'.")
    df["skin_type"] = df["skin_type"].map(normalize_skin_type)
    df = df[df["skin_type"].astype(str).str.len() > 0].copy()

    for column in TARGET_LEVEL_COLUMNS:
        if column not in df.columns:
            df[column] = 0
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0).clip(lower=0, upper=5)
    return df


def train_and_save_models(master_dataset_path: Path, model_artifact_path: Path, random_state: int = 42) -> dict[str, Any]:
    master_df = pd.read_csv(master_dataset_path)
    df = _prepare_master_frame(master_df)

    X = df[FEATURE_COLUMNS]
    y_skin = df["skin_type"]
    y_levels = df[TARGET_LEVEL_COLUMNS]

    X_train, X_test, y_skin_train, y_skin_test, y_levels_train, y_levels_test = train_test_split(
        X,
        y_skin,
        y_levels,
        test_size=0.2,
        random_state=random_state,
        stratify=y_skin,
    )

    encoder = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                FEATURE_COLUMNS,
            )
        ],
        remainder="drop",
    )

    skin_model = Pipeline(
        steps=[
            ("encoder", encoder),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=120,
                    random_state=random_state,
                    min_samples_leaf=2,
                    n_jobs=1,
                ),
            ),
        ]
    )

    level_model = Pipeline(
        steps=[
            ("encoder", encoder),
            (
                "regressor",
                MultiOutputRegressor(
                    RandomForestRegressor(
                        n_estimators=100,
                        random_state=random_state,
                        min_samples_leaf=2,
                        n_jobs=1,
                    )
                ),
            ),
        ]
    )

    skin_model.fit(X_train, y_skin_train)
    level_model.fit(X_train, y_levels_train)

    skin_pred = skin_model.predict(X_test)
    level_pred = level_model.predict(X_test)
    level_mae = mean_absolute_error(y_levels_test, level_pred)

    artifact = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "master_dataset_path": str(master_dataset_path),
        "feature_columns": FEATURE_COLUMNS,
        "target_level_columns": TARGET_LEVEL_COLUMNS,
        "skin_model": skin_model,
        "level_model": level_model,
        "metrics": {
            "skin_type_accuracy": float(accuracy_score(y_skin_test, skin_pred)),
            "level_mae": float(level_mae),
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
        },
    }

    model_artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_artifact_path)
    return artifact


def load_model_artifact(model_artifact_path: Path) -> dict[str, Any]:
    if not model_artifact_path.exists():
        raise FileNotFoundError(f"Model artifact not found: {model_artifact_path}")
    artifact = joblib.load(model_artifact_path)
    required_keys = {"skin_model", "level_model", "feature_columns", "target_level_columns", "metrics"}
    missing = required_keys.difference(artifact.keys())
    if missing:
        raise ValueError(f"Model artifact is invalid. Missing keys: {sorted(missing)}")
    return artifact
