package com.alfahackathon.clientmodelservice.dto;

import com.alfahackathon.clientmodelservice.model.Client;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;

import java.util.Collections;
import java.util.Map;

public class ClientMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @SneakyThrows
    public static ClientDto toDto(Client e) {
        ClientDto dto = new ClientDto();
        dto.setId(e.getId());
        dto.setAge(e.getAge());
        dto.setGender(e.getGender());
        dto.setAdminarea(e.getAdminarea());
        dto.setIncomeValue(e.getIncomeValue());
        dto.setIncomeCategory(e.getIncomeCategory());

        Map<String, Object> featuresMap = Collections.emptyMap();
        if (e.getFeatures() != null && !e.getFeatures().isBlank()) {
            featuresMap = OBJECT_MAPPER.readValue(
                    e.getFeatures(),
                    new TypeReference<Map<String, Object>>() {}
            );
        }
        dto.setFeatures(featuresMap);

        return dto;
    }

    public static ClientWithScoreDto toClientWithScoreDto(Client e,
                                                          Double prob,
                                                          String decision) {
        ClientWithScoreDto dto = new ClientWithScoreDto();
        dto.setClient(toDto(e));
        dto.setApprovalProbability(prob);
        dto.setDecision(decision);
        return dto;
    }
}
