package com.threadwork.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record WearAnalytics(
    long totalWearEvents,
    long garmentWears,
    long wornPieces,
    long neverLoggedPieces,
    BigDecimal wardrobeValue,
    List<Item> items,
    List<Daily> daily
) {
    public record Item(Long garmentId,String name,String category,String imageUrl,BigDecimal purchasePrice,
       long wearCount,BigDecimal costPerWear,LocalDate lastWorn,String status){}
    public record Daily(LocalDate date,long events,long garmentWears){}
}
