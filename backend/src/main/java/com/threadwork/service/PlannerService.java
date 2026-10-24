package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlannerService {
  private static final Set<String> SLOTS=Set.of("MORNING","AFTERNOON","EVENING");
  private static final Set<String> OCCASIONS=Set.of("EVERYDAY","WORK","FORMAL","ACTIVE","OTHER");
  private static final Set<String> SEASONS=Set.of("ALL_SEASONS","SPRING","SUMMER","AUTUMN","WINTER");
  private final OutfitPlanRepository plans;
  private final OutfitRepository outfits;
  private final GarmentRepository garments;
  private final RecommendationService recommendations;

  public PlannerService(OutfitPlanRepository plans, OutfitRepository outfits,
      GarmentRepository garments,RecommendationService recommendations){
    this.plans=plans;this.outfits=outfits;this.garments=garments;this.recommendations=recommendations;
  }
  public record Assignment(LocalDate date,String slot,Long outfitId) {}

  @Transactional(readOnly=true)
  public List<PlanView> calendar(LocalDate start,LocalDate end){
    if(start==null||end==null||end.isBefore(start)||ChronoUnit.DAYS.between(start,end)>90)
      throw bad("Choose an ordered date range of no more than 91 days.");
    return plans.findByDateBetweenOrderByDateAscSlotAsc(start,end).stream().map(this::view).toList();
  }
  @Transactional
  public PlanView assign(Assignment input){
    if(input==null||input.date()==null||input.outfitId()==null||input.outfitId()<1)
      throw bad("Choose a date and an existing saved outfit.");
    String slot=slot(input.slot());
    if(input.date().isBefore(LocalDate.now().minusDays(365))||
       input.date().isAfter(LocalDate.now().plusYears(2)))
      throw bad("Date is outside the supported calendar range.");
    if(!outfits.existsById(input.outfitId()))throw bad("This saved outfit doesn't exist.");
    OutfitPlanEntry entry=plans.findByDateAndSlot(input.date(),slot)
      .orElseGet(()->new OutfitPlanEntry(input.date(),slot,input.outfitId()));
    entry.setOutfitId(input.outfitId()); // Replace that day's slot, never create duplicates.
    return view(plans.save(entry));
  }
  @Transactional
  public void delete(long id){
    if(!plans.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Plan entry not found.");
    plans.deleteById(id);
  }
  @Transactional(readOnly=true)
  public PackingResult pack(PackingRequest request){
    if(request==null||request.occasions()==null||request.occasions().isEmpty()||request.occasions().size()>14)
      throw bad("Choose 1 to 14 trip days.");
    List<String> occasions=new ArrayList<>();
    for(String value:request.occasions()){
      if(value==null||!OCCASIONS.contains(value.toUpperCase(Locale.ROOT).strip()))
        throw bad("Unsupported day activity.");
      occasions.add(value.toUpperCase(Locale.ROOT).strip());
    }
    String season=request.season()==null?"ALL_SEASONS":request.season().toUpperCase(Locale.ROOT).strip();
    if(!SEASONS.contains(season))throw bad("Unsupported season.");
    List<List<RecommendationPack.Suggestion>> options=new ArrayList<>();
    List<String> blockers=new ArrayList<>();
    for(int d=0;d<occasions.size();d++){
      RecommendationPack result=recommendations.recommend(occasions.get(d),season,request.requireLayer(),12);
      options.add(result.suggestions());
      if(result.suggestions().isEmpty())blockers.add("Day "+(d+1)+": "+
        (result.blockers().isEmpty()?"No usable complete combinations.":String.join(" ",result.blockers())));
    }
    List<String> assumptions=List.of(
      "Only garments currently marked Available are considered.",
      "Items and complete looks can be reused across trip days; washing, drying, weather and changes in availability are not simulated.",
      "The optimization is a bounded heuristic: it minimizes unique packed pieces among evaluated outfits, not a proven global optimum.",
      "Occasion and season labels influence scores; they are not strict dress-code or forecast checks."
    );
    if(!blockers.isEmpty())return new PackingResult(List.of(),List.of(),0,blockers,assumptions);

    // Small deterministic beam search over 12 candidate outfits per day.
    // Primary goal: few unique packed garments; secondary: higher metadata match.
    record State(List<RecommendationPack.Suggestion> chosen,Set<Long> ids,int totalScore){}
    List<State> beam=List.of(new State(List.of(),Set.of(),0));
    Comparator<State> comparator=Comparator.comparingInt((State s)->s.ids().size())
      .thenComparing(Comparator.comparingInt(State::totalScore).reversed())
      .thenComparing(s->s.ids().toString());
    for(List<RecommendationPack.Suggestion> daily:options){
      List<State> next=new ArrayList<>();
      for(State current:beam){
        for(RecommendationPack.Suggestion look:daily){
          Set<Long> unique=new TreeSet<>(current.ids());
          unique.addAll(look.garmentIds());
          List<RecommendationPack.Suggestion> chosen=new ArrayList<>(current.chosen());
          chosen.add(look);
          next.add(new State(List.copyOf(chosen),Set.copyOf(unique),current.totalScore()+look.score()));
        }
      }
      next.sort(comparator);
      // Discard identical item sets: prefer higher-scoring paths with the same packing footprint.
      Set<String> seen=new HashSet<>();
      List<State> trimmed=new ArrayList<>();
      for(State state:next){
        String key=new TreeSet<>(state.ids()).toString();
        if(seen.add(key))trimmed.add(state);
        if(trimmed.size()==60)break;
      }
      beam=trimmed;
    }
    State best=beam.get(0);
    Map<Long,Garment> byId=new HashMap<>();
    garments.findAllById(best.ids()).forEach(g->byId.put(g.getId(),g));
    List<Garment> packingList=best.ids().stream().sorted().map(byId::get).filter(Objects::nonNull).toList();
    List<PackingResult.Day> days=new ArrayList<>();
    for(int d=0;d<best.chosen().size();d++){
      RecommendationPack.Suggestion look=best.chosen().get(d);
      days.add(new PackingResult.Day(d+1,occasions.get(d),look.garmentIds(),look.garments(),look.score()));
    }
    return new PackingResult(List.copyOf(days),packingList,packingList.size(),List.of(),assumptions);
  }
  private PlanView view(OutfitPlanEntry entry){
    List<String> warnings=new ArrayList<>();
    Outfit outfit=outfits.findById(entry.getOutfitId()).orElse(null);
    if(outfit==null){
      warnings.add("The saved outfit was deleted. Choose another outfit for this slot.");
      return new PlanView(entry.getId(),entry.getDate(),entry.getSlot(),entry.getOutfitId(),
        "Deleted outfit",List.of(),false,warnings);
    }
    Map<Long,Garment> byId=new HashMap<>();
    garments.findAllById(outfit.getGarmentIds()).forEach(g->byId.put(g.getId(),g));
    List<Garment> resolved=new ArrayList<>();
    for(Long id:outfit.getGarmentIds()){
      Garment g=byId.get(id);
      if(g==null)warnings.add("A garment from this outfit was deleted.");
      else {
        resolved.add(g);
        if(!"AVAILABLE".equals(g.getStatus()))
          warnings.add(g.getName()+" is currently "+g.getStatus().toLowerCase(Locale.ROOT)+". Future readiness is unknown.");
      }
    }
    // Same-date reuse across sessions is a caution, not a prediction of incompatibility.
    for(OutfitPlanEntry other:plans.findByDate(entry.getDate())){
      if(Objects.equals(other.getId(),entry.getId()))continue;
      Outfit otherOutfit=outfits.findById(other.getOutfitId()).orElse(null);
      if(otherOutfit==null)continue;
      boolean overlap=outfit.getGarmentIds().stream().anyMatch(otherOutfit.getGarmentIds()::contains);
      if(overlap)warnings.add("Some pieces also appear in the "+other.getSlot().toLowerCase(Locale.ROOT)+" slot today.");
    }
    return new PlanView(entry.getId(),entry.getDate(),entry.getSlot(),entry.getOutfitId(),
      outfit.getName(),List.copyOf(resolved),warnings.isEmpty(),List.copyOf(warnings));
  }
  private static String slot(String name){
    String result=name==null?"":name.toUpperCase(Locale.ROOT).strip();
    if(!SLOTS.contains(result))throw bad("Choose Morning, Afternoon or Evening.");
    return result;
  }
  private static ResponseStatusException bad(String message){
    return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);
  }
}
