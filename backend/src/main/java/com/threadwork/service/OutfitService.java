package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.*;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OutfitService {
    private static final Set<String> OCCASIONS=Set.of("EVERYDAY","WORK","FORMAL","ACTIVE","OTHER");
    private final OutfitRepository outfits;
    private final GarmentRepository garments;

    public OutfitService(OutfitRepository outfits,GarmentRepository garments) {
        this.outfits=outfits;this.garments=garments;
    }
    @Transactional(readOnly=true)
    public List<OutfitView> list(){
        return outfits.findAll(Sort.by(Sort.Direction.DESC,"createdAt")).stream().map(this::view).toList();
    }
    @Transactional(readOnly=true)
    public OutfitView get(long id){return view(find(id));}
    @Transactional
    public OutfitView create(OutfitRequest request){
        Outfit outfit=new Outfit();
        apply(outfit,request);
        return view(outfits.save(outfit));
    }
    @Transactional
    public OutfitView update(long id,OutfitRequest request){
        Outfit outfit=find(id);
        apply(outfit,request);
        return view(outfits.save(outfit));
    }
    @Transactional
    public void delete(long id){
        if(!outfits.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Outfit not found");
        outfits.deleteById(id);
    }

    private Outfit find(long id){
        return outfits.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Outfit not found"));
    }
    private void apply(Outfit outfit,OutfitRequest request){
        String name=request.name()==null?"":request.name().strip();
        if(name.isEmpty()||name.length()>80)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Give this outfit a name (up to 80 characters).");
        if(request.garmentIds()==null || request.garmentIds().size()<2 || request.garmentIds().size()>12)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose between 2 and 12 distinct pieces.");
        List<Long> ids=request.garmentIds();
        if(ids.stream().anyMatch(id->id==null||id<1)||new HashSet<>(ids).size()!=ids.size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A piece may appear only once in an outfit.");
        Set<Long> present=new HashSet<>();
        garments.findAllById(ids).forEach(g->present.add(g.getId()));
        if(present.size()!=ids.size())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"An item has been removed from your wardrobe. Refresh and try again.");
        String occasion=request.occasion()==null||request.occasion().isBlank()?"EVERYDAY":request.occasion().strip().toUpperCase(Locale.ROOT);
        if(!OCCASIONS.contains(occasion))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown outfit occasion.");
        outfit.setName(name);
        outfit.setOccasion(occasion);
        outfit.setGarmentIds(ids);
    }
    private OutfitView view(Outfit outfit){
        List<Long> ids=outfit.getGarmentIds();
        Map<Long,Garment> byId=new HashMap<>();
        garments.findAllById(ids).forEach(g->byId.put(g.getId(),g));
        List<Garment> resolved=new ArrayList<>();
        List<String> warnings=new ArrayList<>();
        for(Long id:ids){
            Garment g=byId.get(id);
            if(g==null)warnings.add("An item (#"+id+") was deleted from your closet.");
            else {
                resolved.add(g);
                if(!"AVAILABLE".equals(g.getStatus()))
                    warnings.add(g.getName()+" is "+g.getStatus().toLowerCase(Locale.ROOT).replace('_',' ')+".");
            }
        }
        return new OutfitView(outfit.getId(),outfit.getName(),outfit.getOccasion(),
            List.copyOf(ids),resolved,warnings.isEmpty(),warnings,outfit.getCreatedAt());
    }
}
