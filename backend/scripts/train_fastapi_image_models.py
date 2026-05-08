from __future__ import annotations

import argparse
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from image_model_training import train_and_save_image_models


DEFAULT_DATASET_ROOT = Path(r"C:\Users\Khaled\Desktop\Dataset Skincare")
DEFAULT_CONCERN_DATASET = DEFAULT_DATASET_ROOT / "data2" / "dataset"
DEFAULT_SKIN_TYPE_DATASET = DEFAULT_DATASET_ROOT / "data3" / "Oily-Dry-Skin-Types"
DEFAULT_ARTIFACT_PATH = BASE_DIR / "models" / "skincare_image_models.joblib"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train skincare image models for FastAPI /predict.")
    parser.add_argument(
        "--concern-dataset",
        type=Path,
        default=DEFAULT_CONCERN_DATASET,
        help=f"Folder with concern class subfolders (default: {DEFAULT_CONCERN_DATASET})",
    )
    parser.add_argument(
        "--skin-type-dataset",
        type=Path,
        default=DEFAULT_SKIN_TYPE_DATASET,
        help=f"Folder containing train/valid dry-normal-oily classes (default: {DEFAULT_SKIN_TYPE_DATASET})",
    )
    parser.add_argument(
        "--artifact",
        type=Path,
        default=DEFAULT_ARTIFACT_PATH,
        help=f"Output artifact path (default: {DEFAULT_ARTIFACT_PATH})",
    )
    parser.add_argument(
        "--max-images-per-class",
        type=int,
        default=650,
        help="Maximum accepted images per class for training speed and balance.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for deterministic splits.",
    )
    parser.add_argument(
        "--near-duplicate-hamming",
        type=int,
        default=2,
        help="Near-duplicate threshold using perceptual hash Hamming distance (lower = stricter).",
    )
    parser.add_argument(
        "--min-image-dim",
        type=int,
        default=64,
        help="Minimum allowed width/height in pixels; smaller images are skipped.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    artifact = train_and_save_image_models(
        concern_dataset_path=args.concern_dataset,
        skin_type_dataset_path=args.skin_type_dataset,
        model_artifact_path=args.artifact,
        random_state=args.random_state,
        max_images_per_class=args.max_images_per_class,
        near_duplicate_hamming=args.near_duplicate_hamming,
        min_image_dim=args.min_image_dim,
    )
    print("Image model training completed.")
    print(f"Model artifact: {args.artifact}")
    print("Metrics:")
    for key, value in artifact.get("metrics", {}).items():
        print(f"- {key}: {value}")
    print("Concern dedupe stats:")
    for key, value in artifact.get("concern_dedupe_stats", {}).items():
        print(f"- {key}: {value}")
    print("Skin-type dedupe stats:")
    for key, value in artifact.get("skin_type_dedupe_stats", {}).items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()
