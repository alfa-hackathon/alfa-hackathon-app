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

@app.post("/predict")
def predict(request: PredictRequest):
    row: Dict[str, Any] = {}

    for name in FEATURE_NAMES:
        val = request.features.get(name)

        if name in CAT_FEATURES:
            row[name] = str(val) if val is not None else ""
        else:
            if val is None:
                row[name] = 0.0
            else:
                if isinstance(val, str):
                    val = val.replace(',', '.').strip()
                    if val == "":
                        row[name] = 0.0
                    else:
                        try:
                            row[name] = float(val)
                        except ValueError:
                            row[name] = 0.0
                else:
                    row[name] = val

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