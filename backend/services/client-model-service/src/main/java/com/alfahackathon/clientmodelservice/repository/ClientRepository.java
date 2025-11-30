package com.alfahackathon.clientmodelservice.repository;

import com.alfahackathon.clientmodelservice.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {
}
