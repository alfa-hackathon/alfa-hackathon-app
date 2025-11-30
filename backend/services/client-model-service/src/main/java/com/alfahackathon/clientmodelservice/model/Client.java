package com.alfahackathon.clientmodelservice.model;

import com.alfahackathon.clientmodelservice.util.JsonbConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "clients")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Client {
    @Id
    private Long id;

    private String dt;

    private String gender;
    private Integer age;
    private String adminarea;
    private String citySmartName;

    private BigDecimal incomeValue;
    private String incomeCategory;

    @Column(columnDefinition = "text")
    private String features;
}
