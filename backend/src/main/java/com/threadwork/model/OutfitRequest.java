package com.threadwork.model;
import jakarta.validation.constraints.*;
import java.util.List;

public record OutfitRequest(
    @NotBlank @Size(max=80) String name,
    @NotNull @Size(min=2,max=12) List<@NotNull @Positive Long> garmentIds,
    String occasion
) {}
