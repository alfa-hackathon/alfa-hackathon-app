from typing import Dict, Any, List
import math
import numpy as np

from fastapi import FastAPI
from pydantic import BaseModel
from catboost import CatBoostRegressor, Pool, CatBoostClassifier
import pandas as pd

app = FastAPI()

class PredictRequest(BaseModel):
    features: Dict[str, Any]

MODEL_PATH = "catboost_model.cbm"

try:
    model = CatBoostRegressor()
    model.load_model(MODEL_PATH)
except:
    model = CatBoostClassifier()
    model.load_model(MODEL_PATH)

FEATURE_NAMES: List[str] = list(model.feature_names_)
cat_indices = model.get_cat_feature_indices()
CAT_FEATURES = set([FEATURE_NAMES[i] for i in cat_indices])

def build_row(features: Dict[str, Any]) -> Dict[str, Any]:
    row: Dict[str, Any] = {}
    for name in FEATURE_NAMES:
        val = features.get(name)
        if name in CAT_FEATURES:
            if val is None:
                row[name] = ""
            else:
                s_val = str(val)
                if s_val.lower() == "nan":
                    row[name] = ""
                elif s_val.endswith(".0"):
                    row[name] = s_val[:-2]
                else:
                    row[name] = s_val
        else:
            if val is None:
                row[name] = 0.0
            elif isinstance(val, str):
                v = val.replace(",", ".").strip()
                if v == "" or v.lower() == "nan":
                    row[name] = 0.0
                else:
                    try:
                        row[name] = float(v)
                    except:
                        row[name] = 0.0
            else:
                try:
                    if math.isnan(float(val)):
                         row[name] = 0.0
                    else:
                         row[name] = float(val)
                except:
                    row[name] = 0.0
    return row

def salary_to_probability(log_salary):
    threshold = 10.5

    x = (log_salary - threshold) * 2.0
    prob = 1 / (1 + math.exp(-x))
    return prob

@app.post("/predict")
def predict(request: PredictRequest):
    row = build_row(request.features)
    df = pd.DataFrame([row])
    df = df[FEATURE_NAMES]
    pool = Pool(df, cat_features=list(CAT_FEATURES))

    raw_log_salary = float(model.predict(pool)[0])

    predicted_salary_rub = math.exp(raw_log_salary)

    p1 = salary_to_probability(raw_log_salary)

    decision = "APPROVE" if p1 >= 0.6 else "REJECT"

    return {
        "approvalProbability": p1,
        "decision": decision,
        "predictedSalary": predicted_salary_rub
    }

@app.post("/shap")
def shap(request: PredictRequest):
    row = build_row(request.features)
    df = pd.DataFrame([row])
    df = df[FEATURE_NAMES]
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
        if abs(val) > 0.0001
    }

    return {
        "baseValue": base_value,
        "shapValues": shap_dict,
    }