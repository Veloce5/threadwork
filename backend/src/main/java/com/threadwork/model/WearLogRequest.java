package com.threadwork.model;
import java.time.LocalDate;
import java.util.List;

public record WearLogRequest(
    LocalDate wornOn,
    Long outfitId,
    List<Long> garmentIds,
    String notes
) {}
