package com.threadwork.repo;
import com.threadwork.model.GarmentStatusEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GarmentStatusEventRepository extends JpaRepository<GarmentStatusEvent,Long> {
    List<GarmentStatusEvent> findTop40ByOrderByIdDesc();
}
