package com.threadwork.model;

import java.time.Instant;
import java.util.List;
public record OutfitView(
    Long id, String name, String occasion, List<Long> garmentIds,
    List<Garment> garments, boolean available, List<String> warnings, Instant createdAt
) {}
