package com.threadwork.model;

import java.util.List;

/** Recommendations are deterministic wardrobe combinations, not predicted style quality. */
public record RecommendationPack(
    String occasion, String season, boolean requireLayer, int eligiblePieces,
    List<String> blockers, List<Suggestion> suggestions
) {
    public record Suggestion(
        List<Long> garmentIds, List<Garment> garments, int score,
        List<String> reasons, String title
    ) {}
}
