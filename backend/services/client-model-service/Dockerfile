FROM gradle:8.12.0-jdk21-alpine AS builder
WORKDIR /app
COPY . .
RUN ./gradlew --no-daemon clean build -x test

FROM eclipse-temurin:21-jdk AS runner
WORKDIR /app
COPY --from=builder /app/build/libs/client-model-service-0.0.1-SNAPSHOT.jar ./app.jar
EXPOSE 4000
ENTRYPOINT ["java", "-jar", "app.jar"]
