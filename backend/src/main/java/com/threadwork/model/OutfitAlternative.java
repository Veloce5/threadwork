package com.threadwork.model;
import java.util.List;

/** Deterministic candidate replacements for a missing or unavailable saved outfit item. */
public record OutfitAlternative(Long garmentId,String garmentName,String reason,List<Garment> alternatives) {}
