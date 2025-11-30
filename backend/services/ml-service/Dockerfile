FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY ml_service.py .

COPY model_cb_stable.cbm .
COPY model_lgbm_stable.pkl .
COPY model_xgb_stable.json .
COPY model_tabnet_stable.zip.zip .
COPY blend_info.pkl .

EXPOSE 8000

CMD ["uvicorn", "ml_service:app", "--host", "0.0.0.0", "--port", "8000"]