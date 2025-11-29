package com.alfahackathon.clientmodelservice.service;

import com.alfahackathon.clientmodelservice.model.Client;
import com.alfahackathon.clientmodelservice.repository.ClientRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ClientCsvLoader {

    private final ClientRepository clientRepository;
    
    @PostConstruct
    public void load() throws Exception {
        if (clientRepository.count() > 0) {
            return;
        }

        List<Client> batch = new ArrayList<>();

        try (InputStream is = getClass().getResourceAsStream("/hackathon_income_test.csv")) {
            if (is == null) {
                throw new IllegalStateException("hackathon_income_test.csv not found in resources");
            }

            try (InputStreamReader reader = new InputStreamReader(is);
                 CSVReader csv = new CSVReaderBuilder(reader)
                         .withCSVParser(new CSVParserBuilder()
                                 .withSeparator(';')
                                 .build())
                         .build()) {

                String[] header = csv.readNext();
                if (header == null) {
                    throw new IllegalStateException("CSV file is empty");
                }

                int idxId = indexOf(header, "id");
                int idxDt = indexOf(header, "dt");
                int idxAge = indexOf(header, "age");
                int idxGender = indexOf(header, "gender");
                int idxAdminarea = indexOf(header, "adminarea");
                int idxIncomeValue = indexOf(header, "incomeValue");
                int idxIncomeCategory = indexOf(header, "incomeValueCategory");

                String[] row;
                while ((row = csv.readNext()) != null) {
                    if (row.length != header.length) {
                        continue;
                    }

                    Client e = new Client();

                    String idStr = safeGet(row, idxId);
                    if (idStr == null || idStr.isBlank()) {
                        continue;
                    }
                    e.setId(Long.parseLong(idStr));

                    String dtStr = safeGet(row, idxDt);
                    if (dtStr != null && !dtStr.isBlank()) {
                        e.setDt(dtStr);
                    }

                    String ageStr = safeGet(row, idxAge);
                    if (ageStr != null && !ageStr.isBlank()) {
                        e.setAge(Integer.parseInt(ageStr));
                    }

                    String genderStr = safeGet(row, idxGender);
                    if (genderStr != null && !genderStr.isBlank()) {
                        e.setGender(genderStr);
                    }

                    String adminareaStr = safeGet(row, idxAdminarea);
                    if (adminareaStr != null && !adminareaStr.isBlank()) {
                        e.setAdminarea(adminareaStr);
                    }

                    String incomeValStr = safeGet(row, idxIncomeValue);
                    if (incomeValStr != null && !incomeValStr.isBlank()) {
                        try {
                            e.setIncomeValue(new BigDecimal(incomeValStr));
                        } catch (NumberFormatException ex) {
                            System.out.println("logged");
                        }
                    }

                    String incomeCatStr = safeGet(row, idxIncomeCategory);
                    if (incomeCatStr != null && !incomeCatStr.isBlank()) {
                        e.setIncomeCategory(incomeCatStr);
                    }

                    Map<String, Object> features = new HashMap<>();
                    for (int i = 0; i < header.length; i++) {
                        String col = header[i];

                        if (i == idxId || i == idxDt || i == idxAge ||
                                i == idxGender || i == idxAdminarea ||
                                i == idxIncomeValue || i == idxIncomeCategory) {
                            continue;
                        }

                        String val = row[i];
                        if (val == null || val.isBlank()) {
                            continue;
                        }

                        Object valueObj = val;
                        try {
                            if (val.matches("^-?\\d+(\\.\\d+)?$")) {
                                if (val.contains(".")) {
                                    valueObj = Double.parseDouble(val);
                                } else {
                                    valueObj = Long.parseLong(val);
                                }
                            }
                        } catch (NumberFormatException ignore) {
                            valueObj = val;
                        }

                        features.put(col, valueObj);
                    }
                    e.setFeatures(features);

                    batch.add(e);
                }
            }
        }

        clientRepository.saveAll(batch);
    }

    private int indexOf(String[] header, String name) {
        for (int i = 0; i < header.length; i++) {
            if (name.equals(header[i])) {
                return i;
            }
        }
        return -1;
    }

    private String safeGet(String[] row, int idx) {
        if (idx < 0 || idx >= row.length) return null;
        return row[idx];
    }
}

