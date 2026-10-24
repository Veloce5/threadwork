package com.threadwork.model;

import java.time.LocalDate;
import java.util.List;

public record PlanView(
  Long id, LocalDate date, String slot, Long outfitId, String outfitName,
  List<Garment> garments, boolean usableNow, List<String> warnings
) {}
