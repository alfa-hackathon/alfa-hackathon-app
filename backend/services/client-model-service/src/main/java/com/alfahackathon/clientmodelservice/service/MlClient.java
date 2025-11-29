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

    public MlClient(
            @Value("${ml.service.url:http://localhost:5001/predict}") String predictUrl
    ) {
        this.restTemplate = new RestTemplate();
        this.predictUrl = predictUrl;
    }

    public Map<String, Object> predict(Map<String, Object> features) {
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(predictUrl, features, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ML service returned empty response");
            }

            Map<String, Object> body = response.getBody();
            Map<String, Object> res = new HashMap<>();
            res.put("approvalProbability", asDouble(body.getOrDefault("approvalProbability", body.get("probability"))));
            res.put("decision", Objects.toString(body.getOrDefault("decision", body.get("verdict")), null));
            return res;
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ML service call failed", ex);
        }
    }

    private Double asDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
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