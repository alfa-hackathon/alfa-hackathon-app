package com.alfahackathon.clientmodelservice.dto;

import lombok.Data;

@Data
public class ClientWithScoreDto {
    private ClientDto client;
    private Double approvalProbability;
    private String decision;
}
