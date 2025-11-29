package com.alfahackathon.clientmodelservice.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class ClientDto {
    private Long id;
    private Integer age;
    private String gender;
    private String adminarea;
    private BigDecimal incomeValue;
    private String incomeCategory;
    private Map<String, Object> features;
}
