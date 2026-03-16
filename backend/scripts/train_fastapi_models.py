from __future__ import annotations

from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from model_training import train_and_save_models
MASTER_DATASET_PATH = BASE_DIR / "data" / "merged" / "master_questionnaire_prediction_dataset.csv"
MODEL_ARTIFACT_PATH = BASE_DIR / "models" / "skincare_models.joblib"


def main() -> None:
    artifact = train_and_save_models(MASTER_DATASET_PATH, MODEL_ARTIFACT_PATH)
    print("Training completed.")
    print(f"Model artifact: {MODEL_ARTIFACT_PATH}")
    print("Metrics:")
    for key, value in artifact.get("metrics", {}).items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()
