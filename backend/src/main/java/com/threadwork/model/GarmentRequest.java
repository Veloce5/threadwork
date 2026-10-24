package com.threadwork.model;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record GarmentRequest(
    @NotBlank @Size(max=100) String name,
    @NotBlank String category,
    @NotBlank @Pattern(regexp="#[0-9a-fA-F]{6}") String color,
    @Size(max=60) String brand,
    @NotNull @DecimalMin("0.00") @Digits(integer=10, fraction=2) BigDecimal purchasePrice,
    LocalDate purchasedOn,
    @Size(max=500) String notes
) {}
