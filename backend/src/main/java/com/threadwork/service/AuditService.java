package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.*;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only internal consistency audit; no external services or secret API keys. */
@Service
public class AuditService {
  private static final Set<String> STATUSES=Set.of("AVAILABLE","WORN","LAUNDRY","DRYING","REPAIR");
  private final GarmentRepository garments;
  private final OutfitRepository outfits;
  private final OutfitPlanRepository plans;
  private final WearEventRepository wears;
  private final GarmentStatusEventRepository statusEvents;
  private final PhotoService photos;
  private final DataSource datasource;

  public AuditService(GarmentRepository garments,OutfitRepository outfits,
      OutfitPlanRepository plans,WearEventRepository wears,
      GarmentStatusEventRepository statusEvents,PhotoService photos,DataSource datasource){
    this.garments=garments;this.outfits=outfits;this.plans=plans;
    this.wears=wears;this.statusEvents=statusEvents;this.photos=photos;this.datasource=datasource;
  }

  @Transactional(readOnly=true)
  public AuditReport run(){
    List<Garment> owned=garments.findAll();
    List<Outfit> looks=outfits.findAll();
    List<OutfitPlanEntry> calendar=plans.findAll();
    List<WearEvent> logged=wears.findAll();
    List<AuditReport.Issue> issues=new ArrayList<>();
    Set<Long> garmentIds=new HashSet<>();
    Map<Long,Long> wearCounts=new HashMap<>();
    for(Garment g:owned)garmentIds.add(g.getId());
    for(WearEvent entry:logged){
      for(Long id:entry.getGarmentIds()){
        if(id!=null)wearCounts.merge(id,1L,Long::sum);
        if(!garmentIds.contains(id))
          issue(issues,"WARNING","HISTORICAL_PIECE_REMOVED",
            "Wear event #"+entry.getId()+" references a deleted garment (#"+id+"). Its original history remains saved.");
      }
    }
    long photosAttached=0;
    for(Garment g:owned){
      if(g.getWearCount()!=wearCounts.getOrDefault(g.getId(),0L))
        issue(issues,"ERROR","WEAR_COUNT_MISMATCH",
          g.getName()+" (#"+g.getId()+") shows "+g.getWearCount()+" wears, but the journal contains "+
          wearCounts.getOrDefault(g.getId(),0L)+".");
      if(!STATUSES.contains(g.getStatus()))
        issue(issues,"ERROR","UNKNOWN_STATUS","Garment #"+g.getId()+" has an unsupported status.");
      if(g.getImageFile()!=null){
        photosAttached++;
        if(!photos.existsStored(g.getImageFile()))
          issue(issues,"WARNING","MISSING_PHOTO",
            "Photo file is missing for "+g.getName()+" (#"+g.getId()+").");
      }
    }
    Set<Long> outfitIds=new HashSet<>();
    for(Outfit outfit:looks){
      outfitIds.add(outfit.getId());
      for(Long id:outfit.getGarmentIds())
        if(!garmentIds.contains(id))
          issue(issues,"WARNING","OUTFIT_PIECE_REMOVED",
            "Saved outfit '"+outfit.getName()+"' references deleted garment #"+id+".");
    }
    for(OutfitPlanEntry entry:calendar){
      if(!outfitIds.contains(entry.getOutfitId()))
        issue(issues,"WARNING","PLAN_OUTFIT_REMOVED",
          "Calendar entry #"+entry.getId()+" references a deleted outfit.");
    }
    Map<String,Long> totals=new LinkedHashMap<>();
    totals.put("garments",(long)owned.size());
    totals.put("savedOutfits",(long)looks.size());
    totals.put("calendarEntries",(long)calendar.size());
    totals.put("wearEvents",(long)logged.size());
    totals.put("statusChanges",statusEvents.count());
    totals.put("attachedPhotos",photosAttached);
    boolean passed=issues.stream().noneMatch(issue->"ERROR".equals(issue.severity()));
    return new AuditReport(Instant.now(),databaseName(),passed,totals,List.copyOf(issues));
  }
  private String databaseName(){
    try(var connection=datasource.getConnection()){
      String product=connection.getMetaData().getDatabaseProductName();
      return product==null?"Unknown database":product;
    }catch(SQLException e){
      return "Database available, engine not identified";
    }
  }
  private static void issue(List<AuditReport.Issue> issues,String severity,String code,String message){
    issues.add(new AuditReport.Issue(severity,code,message));
  }
}
