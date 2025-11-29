package com.alfahackathon.clientmodelservice.controller;

import com.alfahackathon.clientmodelservice.dto.ClientDto;
import com.alfahackathon.clientmodelservice.dto.ClientMapper;
import com.alfahackathon.clientmodelservice.dto.ClientShortDto;
import com.alfahackathon.clientmodelservice.dto.ClientWithScoreDto;
import com.alfahackathon.clientmodelservice.model.Client;
import com.alfahackathon.clientmodelservice.repository.ClientRepository;
import com.alfahackathon.clientmodelservice.service.MlClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;


import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ClientController {
    private final ClientRepository clientRepository;
    private final MlClient mlClient;

    @GetMapping("/clients")
    public List<ClientShortDto> listClients() {
        return clientRepository.findAll().stream()
                .limit(200)
                .map(e -> {
                    String display = e.getId()
                            + " | " + (e.getAge() != null ? e.getAge() + " лет" : "?")
                            + " | " + (e.getAdminarea() != null ? e.getAdminarea() : "");
                    return new ClientShortDto(e.getId(), display);
                })
                .toList();
    }

    @GetMapping("/client/{id}")
    public ClientDto getClient(@PathVariable Long id) {
        Client e = clientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Client not found"
                ));
        return ClientMapper.toDto(e);
    }

    @PostMapping("/client/{id}/predict")
    public ClientWithScoreDto predict(@PathVariable Long id) throws IOException {
        Client e = clientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Client not found"
                ));

        Map<String, Object> features = new HashMap<>();
        features.put("age", e.getAge());
        features.put("gender", e.getGender());
        features.put("adminarea", e.getAdminarea());
        features.put("incomeValue", e.getIncomeValue());

        if (e.getFeatures() != null && !e.getFeatures().isBlank()) {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> extra = objectMapper.readValue(
                    e.getFeatures(),
                    new TypeReference<Map<String, Object>>() {}
            );
            features.putAll(extra);
        }

        Map<String, Object> mlResp = mlClient.predict(features);
        Double prob = (Double) mlResp.get("approvalProbability");
        String decision = (String) mlResp.get("decision");

        return ClientMapper.toClientWithScoreDto(e, prob, decision);
    }
}
