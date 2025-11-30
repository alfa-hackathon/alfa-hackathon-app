from typing import Dict, Any, List

from fastapi import FastAPI
from pydantic import BaseModel
from catboost import CatBoostClassifier, Pool
import pandas as pd

app = FastAPI()


class PredictRequest(BaseModel):
    features: Dict[str, Any]


MODEL_PATH = "catboost_model.cbm"

model = CatBoostClassifier()
model.load_model(MODEL_PATH)

FEATURE_NAMES: List[str] = list(model.feature_names_)

cat_indices = model.get_cat_feature_indices()
CAT_FEATURES = set([FEATURE_NAMES[i] for i in cat_indices])

print(f"Detected categorical features: {CAT_FEATURES}")


def build_row(features: Dict[str, Any]) -> Dict[str, Any]:
    row: Dict[str, Any] = {}

    for name in FEATURE_NAMES:
        val = features.get(name)

        if name in CAT_FEATURES:
            row[name] = "" if val is None else str(val)
        else:
            if val is None:
                row[name] = 0.0
            else:
                if isinstance(val, str):
                    v = val.replace(",", ".").strip()
                    if v == "":
                        row[name] = 0.0
                    else:
                        try:
                            row[name] = float(v)
                        except ValueError:
                            row[name] = 0.0
                else:
                    row[name] = val

    return row


@app.post("/predict")
def predict(request: PredictRequest):
    row = build_row(request.features)
    df = pd.DataFrame([row])
    pool = Pool(df, cat_features=list(CAT_FEATURES))

    if hasattr(model, "predict_proba"):
        proba: List[List[float]] = model.predict_proba(pool)
        p1 = float(proba[0][1])
    else:
        raw = float(model.predict(pool)[0])
        p1 = max(0.0, min(1.0, raw))

    decision = "APPROVE" if p1 >= 0.5 else "REJECT"

    return {
        "approvalProbability": p1,
        "decision": decision,
    }


@app.post("/shap")
def shap(request: PredictRequest):
    row = build_row(request.features)
    df = pd.DataFrame([row])
    pool = Pool(df, cat_features=list(CAT_FEATURES))

    shap_matrix = model.get_feature_importance(
        data=pool,
        type="ShapValues",
        prettified=False,
    )
    shap_row = shap_matrix[0]
    shap_values_only = shap_row[:-1]
    base_value = float(shap_row[-1])

    shap_dict = {
        name: float(val)
        for name, val in zip(FEATURE_NAMES, shap_values_only)
    }

    return {
        "baseValue": base_value,
        "shapValues": shap_dict,
    }
