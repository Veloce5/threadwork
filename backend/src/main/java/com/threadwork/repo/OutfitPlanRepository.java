package com.threadwork.repo;

import com.threadwork.model.OutfitPlanEntry;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutfitPlanRepository extends JpaRepository<OutfitPlanEntry,Long> {
  Optional<OutfitPlanEntry> findByDateAndSlot(LocalDate date,String slot);
  List<OutfitPlanEntry> findByDateBetweenOrderByDateAscSlotAsc(LocalDate start,LocalDate end);
  List<OutfitPlanEntry> findByDate(LocalDate date);
}
