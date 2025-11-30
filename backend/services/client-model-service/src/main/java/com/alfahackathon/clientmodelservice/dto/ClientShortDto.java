package com.alfahackathon.clientmodelservice.dto;

import java.math.BigDecimal;

public record ClientShortDto(
        Long id,
        Integer age,
        String region,
        BigDecimal income
) {}
