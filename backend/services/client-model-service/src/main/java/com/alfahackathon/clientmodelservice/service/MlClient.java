package com.alfahackathon.clientmodelservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class MlClient {

    private final RestTemplate restTemplate;
    private final String predictUrl;
    private final String shapUrl;

    public MlClient(
            @Value("${ml.service.url:http://localhost:8000/predict}") String predictUrl,
            @Value("${ml.service.shap-url:http://localhost:8080/shap}") String shapUrl
    ) {
        this.restTemplate = new RestTemplate();
        this.predictUrl = predictUrl;
        this.shapUrl = shapUrl;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> predict(Map<String, Object> features) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("features", features);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(predictUrl, body, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "ML service returned empty or non-2xx response"
                );
            }

            Map<String, Object> respBody = response.getBody();
            Map<String, Object> res = new HashMap<>();
            res.put("approvalProbability",
                    asDouble(respBody.getOrDefault("approvalProbability",
                            respBody.get("probability"))));
            res.put("decision",
                    Objects.toString(respBody.getOrDefault("decision",
                            respBody.get("verdict")), null));
            return res;
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "ML service call failed",
                    ex
            );
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> shap(Map<String, Object> features) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("features", features);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(shapUrl, body, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "ML SHAP service returned empty or non-2xx response"
                );
            }

            return response.getBody();
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "ML SHAP service call failed",
                    ex
            );
        }
    }

    private Double asDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.doubleValue();
        if (value instanceof String str) {
            try {
                return Double.parseDouble(str);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
