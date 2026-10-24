package com.threadwork.repo;

import com.threadwork.model.WearEvent;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WearEventRepository extends JpaRepository<WearEvent,Long> {}
