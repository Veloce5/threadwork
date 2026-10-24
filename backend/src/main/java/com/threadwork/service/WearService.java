package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Source-of-truth dated events; wearCount on Garment is a recalculated display cache. */
@Service
public class WearService {
    private final WearEventRepository events;
    private final GarmentRepository garments;
    private final OutfitRepository outfits;
    private final GarmentService garmentService;
    public WearService(WearEventRepository events,GarmentRepository garments,OutfitRepository outfits,GarmentService garmentService){
        this.events=events;this.garments=garments;this.outfits=outfits;this.garmentService=garmentService;
    }
    @Transactional(readOnly=true)
    public List<WearEvent> history(){
        return events.findAll(Sort.by(Sort.Direction.DESC,"wornOn").and(Sort.by(Sort.Direction.DESC,"id")));
    }
    @Transactional
    public WearEvent log(WearLogRequest input){
        if(input==null)throw bad("Enter an outfit or select at least one garment.");
        LocalDate date=input.wornOn()==null?LocalDate.now():input.wornOn();
        if(date.isAfter(LocalDate.now()))throw bad("You cannot log a future wear.");
        String notes=input.notes()==null?"":input.notes().strip();
        if(notes.length()>200)throw bad("Keep notes within 200 characters.");
        Outfit outfit=null;
        List<Long> ids;
        if(input.outfitId()!=null){
            if(input.garmentIds()!=null&&!input.garmentIds().isEmpty())
                throw bad("Choose either a saved outfit or individual pieces, not both.");
            outfit=outfits.findById(input.outfitId()).orElseThrow(()->bad("Saved outfit not found."));
            ids=List.copyOf(outfit.getGarmentIds());
        } else {
            ids=input.garmentIds()==null?List.of():input.garmentIds();
        }
        if(ids.isEmpty()||ids.size()>12)throw bad("Select between 1 and 12 pieces.");
        if(ids.stream().anyMatch(id->id==null||id<1)||new HashSet<>(ids).size()!=ids.size())
            throw bad("Choose valid, distinct garments.");
        Map<Long,Garment> found=new HashMap<>();
        garments.findAllById(ids).forEach(g->found.put(g.getId(),g));
        if(found.size()!=ids.size())throw bad("A chosen garment no longer exists. Refresh your closet.");
        // A past entry describes historical use and must not alter today's garment availability.
        boolean today=date.equals(LocalDate.now());
        if(today)for(Long id:ids)if(!"AVAILABLE".equals(found.get(id).getStatus()))
            throw bad(found.get(id).getName()+" is currently "+found.get(id).getStatus().toLowerCase(Locale.ROOT)+". Only available garments can be logged as worn today.");
        WearEvent event=events.save(new WearEvent(date,outfit==null?null:outfit.getId(),
            outfit==null?null:outfit.getName(),notes,ids));
        for(Long id:ids){
            long count=events.countByGarmentId(id);
            Garment g=found.get(id);
            g.setWearCount(count); // Derived from immutable events, not increased blindly.
            garments.save(g);
            if(today)garmentService.changeStatus(id,"WORN","WEAR_LOG");
        }
        return event;
    }
    @Transactional(readOnly=true)
    public WearAnalytics analytics(){
        List<WearEvent> all=events.findAll();
        List<Garment> owned=garments.findAll();
        Map<Long,Long> counts=new HashMap<>();
        Map<Long,LocalDate> last=new HashMap<>();
        Map<LocalDate,long[]> byDate=new TreeMap<>();
        for(WearEvent event:all){
            long[] daily=byDate.computeIfAbsent(event.getWornOn(),d->new long[2]);
            daily[0]++;daily[1]+=event.getGarmentIds().size();
            for(Long id:event.getGarmentIds()){
                counts.merge(id,1L,Long::sum);
                last.merge(id,event.getWornOn(),(a,b)->a.isAfter(b)?a:b);
            }
        }
        List<WearAnalytics.Item> items=owned.stream().map(g->{
            long wearCount=counts.getOrDefault(g.getId(),0L);
            BigDecimal cost=wearCount==0?null:
                g.getPurchasePrice().divide(BigDecimal.valueOf(wearCount),2,RoundingMode.HALF_UP);
            return new WearAnalytics.Item(g.getId(),g.getName(),g.getCategory(),g.getImageUrl(),
                g.getPurchasePrice(),wearCount,cost,last.get(g.getId()),g.getStatus());
        }).sorted(Comparator.comparingLong(WearAnalytics.Item::wearCount).reversed()
            .thenComparing(WearAnalytics.Item::name)).toList();
        List<WearAnalytics.Daily> daily=byDate.entrySet().stream()
            .map(e->new WearAnalytics.Daily(e.getKey(),e.getValue()[0],e.getValue()[1])).toList();
        BigDecimal value=owned.stream().map(Garment::getPurchasePrice).reduce(BigDecimal.ZERO,BigDecimal::add);
        return new WearAnalytics(all.size(),counts.values().stream().mapToLong(Long::longValue).sum(),
            items.stream().filter(x->x.wearCount()>0).count(),
            items.stream().filter(x->x.wearCount()==0).count(),value,items,daily);
    }
    private static ResponseStatusException bad(String message){
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);
    }
}
