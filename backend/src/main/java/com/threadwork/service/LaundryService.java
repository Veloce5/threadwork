package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LaundryService {
    private static final Map<String,Set<String>> NEXT=Map.of(
        "AVAILABLE",Set.of("WORN","LAUNDRY","REPAIR"),
        "WORN",Set.of("AVAILABLE","LAUNDRY","REPAIR"),
        "LAUNDRY",Set.of("DRYING","AVAILABLE","REPAIR"),
        "DRYING",Set.of("AVAILABLE","LAUNDRY","REPAIR"),
        "REPAIR",Set.of("AVAILABLE","LAUNDRY")
    );
    private final GarmentService garments;
    private final GarmentRepository garmentRepo;
    private final OutfitRepository outfitRepo;
    private final GarmentStatusEventRepository events;
    public LaundryService(GarmentService garments, GarmentRepository garmentRepo, OutfitRepository outfitRepo,
                          GarmentStatusEventRepository events) {
        this.garments=garments;this.garmentRepo=garmentRepo;this.outfitRepo=outfitRepo;this.events=events;
    }
    @Transactional
    public Garment transition(long garmentId,String to){
        if(to==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a next clothing status.");
        Garment garment=garments.find(garmentId);
        String desired=to.toUpperCase(Locale.ROOT);
        if(!NEXT.getOrDefault(garment.getStatus(),Set.of()).contains(desired))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot move from "+garment.getStatus()+" to "+desired+" in the laundry workflow.");
        return garments.changeStatus(garmentId,desired,"LAUNDRY_WORKFLOW");
    }
    @Transactional(readOnly=true)
    public List<GarmentStatusEvent> history(){return events.findTop40ByOrderByIdDesc();}

    /** Uses actual saved outfit positions and real wardrobe state; never edits the saved outfit. */
    @Transactional(readOnly=true)
    public List<OutfitAlternative> alternatives(long outfitId){
        Outfit outfit=outfitRepo.findById(outfitId)
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Outfit not found"));
        Map<Long,Garment> owned=new HashMap<>();
        garmentRepo.findAll().forEach(g->owned.put(g.getId(),g));
        Set<Long> used=new HashSet<>(outfit.getGarmentIds());
        List<OutfitAlternative> suggestions=new ArrayList<>();
        for(Long id:outfit.getGarmentIds()){
            Garment current=owned.get(id);
            if(current!=null && "AVAILABLE".equals(current.getStatus()))continue;
            if(current==null){
                suggestions.add(new OutfitAlternative(id,"Deleted garment","This piece was removed. Open Outfit Studio to edit the saved look.",List.of()));
                continue;
            }
            Comparator<Garment> preference=Comparator
                .comparingInt((Garment g)->Objects.equals(g.getOccasion(),outfit.getOccasion())?0:1)
                .thenComparingInt(g->Objects.equals(g.getSeason(),current.getSeason())?0:
                     "ALL_SEASONS".equals(g.getSeason())?1:2)
                .thenComparing(Garment::getName)
                .thenComparing(Garment::getId);
            List<Garment> replacements=owned.values().stream()
                .filter(g->!used.contains(g.getId()))
                .filter(g->"AVAILABLE".equals(g.getStatus()))
                .filter(g->Objects.equals(g.getCategory(),current.getCategory()))
                .sorted(preference).limit(3).toList();
            suggestions.add(new OutfitAlternative(id,current.getName(),
                current.getName()+" is "+current.getStatus().toLowerCase(Locale.ROOT)+".",replacements));
        }
        return suggestions;
    }
}
