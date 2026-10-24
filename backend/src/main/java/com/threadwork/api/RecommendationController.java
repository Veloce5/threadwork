package com.threadwork.api;

import com.threadwork.model.RecommendationPack;
import com.threadwork.service.RecommendationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService service;
    public RecommendationController(RecommendationService service){this.service=service;}
    @GetMapping
    public RecommendationPack recommend(
      @RequestParam(defaultValue="EVERYDAY") String occasion,
      @RequestParam(defaultValue="ALL_SEASONS") String season,
      @RequestParam(defaultValue="false") boolean requireLayer,
      @RequestParam(defaultValue="8") int limit){
        return service.recommend(occasion,season,requireLayer,limit);
    }
}
