package com.alfahackathon.clientmodelservice.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MlClient {
    public Map<String, Object> predict(Map<String, Object> features) {
        // TODO run python service, not just example
        Object incomeObj = features.get("incomeValue");
        double income = 0.0;
        if (incomeObj instanceof Number) {
            income = ((Number) incomeObj).doubleValue();
        }

        double prob;
        if (income > 150_000) prob = 0.9;
        else if (income > 70_000) prob = 0.7;
        else prob = 0.3;

        String decision = prob >= 0.5 ? "APPROVE" : "REJECT";

        Map<String, Object> res = new HashMap<>();
        res.put("approvalProbability", prob);
        res.put("decision", decision);
        return res;
    }
}
