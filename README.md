# Структура проекта

```text
backend/
  services/
    ml-service/            # сервис на пайтон + модели
    client-model-service/  # сервис на java для связи frontend и python-сервиса
frontend/
  реакт-приложение
```

# Запуск проекта

Предполагается, что вы находитесь в корневой директории проекта `/your-path/alfa-hackathon/`.

## 1. Запуск Frontend

```bash
cd frontend/
npm run dev
# (после этого запустится ReactJS приложение на порту localhost:5173)
```

## 2. Подготовка окружения Backend

Вернитесь в корень проекта.

### Создание сети

Перед запуском контейнеров необходимо создать общую сеть:

```bash
docker network create alfa-hackathon
```

### Запуск базы данных (PostgreSQL)

```bash
docker run -d \
  --name client-model-service-db \
  --network alfa-hackathon \
  -p 5000:5432 \
  -e POSTGRES_DB=db \
  -e POSTGRES_USER=admin_user \
  -e POSTGRES_PASSWORD=password \
  -v /создайте-папку-для-хранения-бд/db_volumes/client-model-service-db:/var/lib/postgresql \
  postgres:latest
```
> **Важно:** Замените `/создайте-папку-для-хранения-бд/...` на реальный абсолютный путь к папке на вашем компьютере, где будут храниться данные БД.

---

## 3. Запуск Java сервиса (client-model-service)

*Настройки сконвертированы из конфигурации IntelliJ IDEA.*

### Сборка образа
Выполнять из корня проекта (`alfa-hackathon`):

```bash
docker build -f backend/services/client-model-service/Dockerfile -t client-model-service:latest .
```

### Запуск контейнера

```bash
docker run -d \
  --name client-model-service \
  --network alfa-hackathon \
  -p 4000:4000 \
  -e ML_SERVICE_SHAP_URL=http://ml-service:8000/shap \
  -e ML_SERVICE_URL=http://ml-service:8000/predict \
  -e SPRING_DATASOURCE_PASSWORD=password \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://client-model-service-db:5432/db \
  -e SPRING_DATASOURCE_USERNAME=admin_user \
  -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  -e SPRING_SQL_INIT_MODE=always \
  client-model-service:latest
```

---

## 4. Запуск ML сервиса (ml-service)

*Настройки сконвертированы из конфигурации IntelliJ IDEA.*

### Сборка образа
Выполнять из корня проекта (`alfa-hackathon`):

```bash
docker build -f backend/services/ml-service/Dockerfile -t ml-service:latest .
```

### Запуск контейнера

```bash
docker run -d \
  --name ml-service \
  --network alfa-hackathon \
  -p 8000:8000 \
  ml-service:latest
```

## Проект выполнила команда BB Team
### Участники
Быков Лев
Шумбалов Айдар
Василевич Алиса
Суворов Станислав