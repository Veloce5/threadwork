package com.threadwork.service;

import com.threadwork.model.Garment;
import com.threadwork.model.RecommendationPack;
import com.threadwork.repo.GarmentRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RecommendationService {
    private static final Set<String> OCCASIONS = Set.of("EVERYDAY","WORK","FORMAL","ACTIVE","OTHER");
    private static final Set<String> SEASONS = Set.of("ALL_SEASONS","SPRING","SUMMER","AUTUMN","WINTER");
    private final GarmentRepository garments;
    public RecommendationService(GarmentRepository garments){this.garments=garments;}

    @Transactional(readOnly=true)
    public RecommendationPack recommend(String occasionInput,String seasonInput,boolean requireLayer,int limit) {
        String occasion=choice(occasionInput,"EVERYDAY",OCCASIONS,"occasion");
        String season=choice(seasonInput,"ALL_SEASONS",SEASONS,"season");
        if(limit<1||limit>20)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Limit must be between 1 and 20.");

        List<Garment> eligible=garments.findAll().stream()
            .filter(g->"AVAILABLE".equals(g.getStatus()))
            .sorted(Comparator.comparing(Garment::getId)).toList();
        Map<String,List<Garment>> byType=new HashMap<>();
        for(Garment g:eligible)byType.computeIfAbsent(g.getCategory(),k->new ArrayList<>()).add(g);
        List<Garment> tops=byType.getOrDefault("TOPS",List.of());
        List<Garment> bottoms=byType.getOrDefault("BOTTOMS",List.of());
        List<Garment> dresses=byType.getOrDefault("DRESSES",List.of());
        List<Garment> shoes=byType.getOrDefault("FOOTWEAR",List.of());
        List<Garment> outerwear=byType.getOrDefault("OUTERWEAR",List.of());

        List<String> blockers=new ArrayList<>();
        if(shoes.isEmpty())blockers.add("No ready-to-wear footwear. Move a pair from Worn/Laundry to Available when it is ready.");
        if((tops.isEmpty()||bottoms.isEmpty())&&dresses.isEmpty())
            blockers.add("A complete outfit needs a dress or an available top and bottom.");
        if(requireLayer&&outerwear.isEmpty())blockers.add("Layer required, but no outerwear is currently available.");
        if(!blockers.isEmpty())return new RecommendationPack(occasion,season,requireLayer,eligible.size(),blockers,List.of());

        // Limit per category to bound computation for unusually large closets.
        // These are the best matches to the stated preferences, not appearance judgments.
        List<Garment> rankedTops=best(tops,occasion,season,32);
        List<Garment> rankedBottoms=best(bottoms,occasion,season,32);
        List<Garment> rankedDresses=best(dresses,occasion,season,32);
        List<Garment> rankedShoes=best(shoes,occasion,season,32);
        List<Garment> rankedLayers=best(outerwear,occasion,season,12);

        List<RecommendationPack.Suggestion> choices=new ArrayList<>();
        // With a large closet cap the combinations evaluated to protect API latency.
        int cap=0;
        outer:for(Garment top:rankedTops)for(Garment bottom:rankedBottoms)for(Garment shoe:rankedShoes){
            if(cap++>=20000)break outer;
            append(choices,List.of(top,bottom,shoe),occasion,season);
        }
        cap=0;
        outer:for(Garment dress:rankedDresses)for(Garment shoe:rankedShoes){
            if(cap++>=20000)break outer;
            append(choices,List.of(dress,shoe),occasion,season);
        }

        List<RecommendationPack.Suggestion> complete=new ArrayList<>();
        if(requireLayer) {
            for(RecommendationPack.Suggestion base:choices)for(Garment layer:rankedLayers){
                List<Garment> combined=new ArrayList<>(base.garments());
                combined.add(layer);
                append(complete,combined,occasion,season);
            }
        } else {
            complete.addAll(choices);
        }

        // Use independent, explained heuristics; avoid a few repeated identical looks
        // when there's variety in the closet.
        complete.sort(Comparator.comparingInt(RecommendationPack.Suggestion::score).reversed()
            .thenComparing(s->s.garmentIds().toString()));
        List<RecommendationPack.Suggestion> selected=new ArrayList<>();
        Set<String> keys=new HashSet<>();
        for(RecommendationPack.Suggestion s:complete){
            String key=s.garmentIds().toString();
            if(keys.add(key))selected.add(s);
            if(selected.size()>=limit)break;
        }
        return new RecommendationPack(occasion,season,requireLayer,eligible.size(),List.of(),selected);
    }

    private void append(List<RecommendationPack.Suggestion> output,List<Garment> input,String occasion,String season) {
        List<Long> ids=input.stream().map(Garment::getId).toList();
        int occasionMatches=(int)input.stream().filter(g->occasion.equals(g.getOccasion())).count();
        int seasonMatches=(int)input.stream().filter(g->season.equals(g.getSeason())).count();
        int yearRound=(int)input.stream().filter(g->"ALL_SEASONS".equals(g.getSeason())).count();

        int score=40+occasionMatches*12+seasonMatches*10+yearRound*5;
        if("ALL_SEASONS".equals(season))score-=yearRound*5; // Year-round is neutral when no season requested.
        score+=Math.min(input.stream().mapToLong(Garment::getWearCount).min().orElse(0),5)*(-1);
        // Explanation reflects only metadata and explicit recorded wears.
        List<String> reasons=new ArrayList<>();
        reasons.add("Every garment is currently marked Available.");
        if(occasionMatches>0)reasons.add(occasionMatches+" piece(s) match your "+occasion.toLowerCase(Locale.ROOT)+" occasion tag.");
        if(seasonMatches>0&&!"ALL_SEASONS".equals(season))reasons.add(seasonMatches+" piece(s) match the selected "+season.toLowerCase(Locale.ROOT)+" season.");
        if(yearRound>0&&!"ALL_SEASONS".equals(season))reasons.add(yearRound+" piece(s) are tagged year-round.");
        long least=input.stream().mapToLong(Garment::getWearCount).min().orElse(0);
        if(least==0)reasons.add("Contains a piece with no recorded wears, giving it a chance to enter rotation.");
        String title=input.get(0).getName()+" + "+(input.size()>2?input.get(1).getName():input.get(1).getName());
        output.add(new RecommendationPack.Suggestion(ids,List.copyOf(input),score,List.copyOf(reasons),title));
    }

    private List<Garment> best(List<Garment> garments,String occasion,String season,int max) {
        return garments.stream()
            .sorted(Comparator.comparingInt((Garment g)->matches(g,occasion,season)).reversed()
                .thenComparingLong(Garment::getWearCount).thenComparing(Garment::getId))
            .limit(max).toList();
    }
    private int matches(Garment g,String occasion,String season){
        return (occasion.equals(g.getOccasion())?12:0)+
            (!"ALL_SEASONS".equals(season)&&season.equals(g.getSeason())?10:0)+
            (!"ALL_SEASONS".equals(season)&&"ALL_SEASONS".equals(g.getSeason())?5:0);
    }
    private static String choice(String input,String fallback,Set<String> allowed,String label){
        String normalized=input==null||input.isBlank()?fallback:input.toUpperCase(Locale.ROOT).strip();
        if(!allowed.contains(normalized))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported "+label+".");
        return normalized;
    }
}
