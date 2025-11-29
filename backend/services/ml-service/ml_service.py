from typing import Dict, Any, List

from fastapi import FastAPI
from pydantic import BaseModel
from catboost import CatBoostClassifier  # или CatBoostRegressor, если скажут
import pandas as pd

app = FastAPI()

class PredictRequest(BaseModel):
    features: Dict[str, Any]

MODEL_PATH = "catboost_model.cbm"

model = CatBoostClassifier()
model.load_model(MODEL_PATH)  # формат cbm [web:114][web:115]

@app.post("/predict")
def predict(request: PredictRequest):
    # делаем DataFrame с одной строкой, колонки = имена фич
    df = pd.DataFrame([request.features])

    # для классификатора берём predict_proba
    if hasattr(model, "predict_proba"):
        proba: List[List[float]] = model.predict_proba(df)  # type: ignore
        p1 = float(proba[0][1])  # вероятность класса 1
    else:
        # если вдруг регрессор
        raw = float(model.predict(df)[0])  # type: ignore
        p1 = max(0.0, min(1.0, raw))

    decision = "APPROVE" if p1 >= 0.5 else "REJECT"

    return {
        "approvalProbability": p1,
        "decision": decision,
    }
