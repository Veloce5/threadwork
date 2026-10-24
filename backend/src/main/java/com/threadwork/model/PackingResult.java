package com.threadwork.model;

import java.util.List;

public record PackingResult(
    List<Day> days, List<Garment> packedItems, int totalItems,
    List<String> blockers, List<String> assumptions
) {
  public record Day(int day,String occasion,List<Long> garmentIds,List<Garment> garments,int matchScore){}
}
