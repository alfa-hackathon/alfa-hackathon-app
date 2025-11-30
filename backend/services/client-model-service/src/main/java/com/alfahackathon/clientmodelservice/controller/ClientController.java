package com.alfahackathon.clientmodelservice.controller;

import com.alfahackathon.clientmodelservice.dto.ClientDto;
import com.alfahackathon.clientmodelservice.dto.ClientShortDto;
import com.alfahackathon.clientmodelservice.dto.ClientWithScoreDto;
import com.alfahackathon.clientmodelservice.dto.ClientMapper;
import com.alfahackathon.clientmodelservice.model.Client;
import com.alfahackathon.clientmodelservice.repository.ClientRepository;
import com.alfahackathon.clientmodelservice.service.MlClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ClientController {

    private final ClientRepository clientRepository;
    private final MlClient mlClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ClientController(ClientRepository clientRepository, MlClient mlClient) {
        this.clientRepository = clientRepository;
        this.mlClient = mlClient;
    }

    @GetMapping("/clients")
    public Page<ClientShortDto> listClients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        return clientRepository.findAll(pageable)
                .map(this::toShortDto);
    }

    private ClientShortDto toShortDto(Client e) {
        return new ClientShortDto(
                e.getId(),
                e.getAge(),
                e.getAdminarea(),
                e.getIncomeValue()
        );
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
        features.put("incomeValueCategory", e.getIncomeCategory());
        features.put("city_smart_name", e.getCitySmartName());

        String rawFeaturesJson = e.getFeatures();
        if (rawFeaturesJson != null && !rawFeaturesJson.isBlank()) {
            Map<String, Object> extra = objectMapper.readValue(
                    rawFeaturesJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            features.putAll(extra);
        }

        Map<String, Object> mlResp = mlClient.predict(features);
        Double prob = (Double) mlResp.get("approvalProbability");
        String decision = (String) mlResp.get("decision");

        return ClientMapper.toClientWithScoreDto(e, prob, decision);
    }

    @PostMapping("/client/{id}/shap")
    public Map<String, Object> shap(@PathVariable Long id) throws IOException {
        Client e = clientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Client not found"
                ));

        Map<String, Object> features = buildFeatures(e);

        return mlClient.shap(features);
    }

    private Map<String, Object> buildFeatures(Client e) throws IOException {
        Map<String, Object> features = new HashMap<>();

        features.put("age", e.getAge());
        features.put("gender", e.getGender());
        features.put("adminarea", e.getAdminarea());
        features.put("incomeValue", e.getIncomeValue());
        features.put("incomeValueCategory", e.getIncomeCategory());
        features.put("city_smart_name", e.getCitySmartName());

        String rawFeaturesJson = e.getFeatures();
        if (rawFeaturesJson != null && !rawFeaturesJson.isBlank()) {
            Map<String, Object> extra = objectMapper.readValue(
                    rawFeaturesJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            features.putAll(extra);
        }

        return features;
    }
}
