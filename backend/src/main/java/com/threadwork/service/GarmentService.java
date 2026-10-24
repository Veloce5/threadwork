package com.threadwork.service;

import com.threadwork.model.*;
import com.threadwork.repo.GarmentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GarmentService {
    private static final Set<String> CATEGORIES = Set.of("TOPS", "BOTTOMS", "OUTERWEAR", "DRESSES", "FOOTWEAR", "ACCESSORIES");
    private static final Set<String> STATUSES = Set.of("AVAILABLE", "WORN", "LAUNDRY", "DRYING", "REPAIR");
    private static final Set<String> SEASONS = Set.of("ALL_SEASONS","SPRING","SUMMER","AUTUMN","WINTER");
    private static final Set<String> OCCASIONS = Set.of("EVERYDAY","WORK","FORMAL","ACTIVE","OTHER");
    private final GarmentRepository repo;
    private final PhotoService photos;
    public GarmentService(GarmentRepository repo, PhotoService photos) { this.repo = repo; this.photos=photos; }

    public List<Garment> list() { return repo.findAll().stream().sorted(Comparator.comparing(Garment::getCreatedAt).reversed()).toList(); }
    public Garment find(long id) { return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Garment not found")); }

    public Garment create(GarmentRequest form) {
        Garment g = new Garment(); apply(g, form); return repo.save(g);
    }
    public Garment update(long id, GarmentRequest form) {
        Garment g = find(id); apply(g, form); return repo.save(g);
    }
    public Garment changeStatus(long id, String status) {
        String next = requireStatus(status);
        Garment g = find(id); g.setStatus(next); return repo.save(g);
    }
    public void delete(long id) {
        Garment garment=find(id);
        repo.delete(garment);
        photos.delete(garment.getImageFile());
    }
    public Garment uploadPhoto(long id, org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        Garment garment = find(id);
        String previous = garment.getImageFile();
        String stored = photos.store(file);
        try {
            garment.setImageFile(stored);
            Garment saved=repo.save(garment);
            photos.delete(previous);
            return saved;
        } catch (RuntimeException e) {
            photos.delete(stored);
            throw e;
        }
    }
    public PhotoService.Photo readPhoto(long id) throws java.io.IOException {
        return photos.read(find(id).getImageFile());
    }
    public Garment removePhoto(long id) {
        Garment garment=find(id);
        String old=garment.getImageFile();
        garment.setImageFile(null);
        Garment saved=repo.save(garment);
        photos.delete(old);
        return saved;
    }

    public Map<String, Object> summary() {
        List<Garment> garments=repo.findAll();
        long available=garments.stream().filter(g -> "AVAILABLE".equals(g.getStatus())).count();
        long inLaundry=garments.stream().filter(g -> "LAUNDRY".equals(g.getStatus()) || "DRYING".equals(g.getStatus())).count();
        BigDecimal value=garments.stream().map(Garment::getPurchasePrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalWears=garments.stream().mapToLong(Garment::getWearCount).sum();
        return Map.of("totalItems",garments.size(),"availableItems",available,"laundryItems",inLaundry,
                      "wardrobeValue",value.setScale(2,RoundingMode.HALF_UP),"totalWears",totalWears,
                      "savedOutfits",0,"currency","USD");
    }

    public Map<String, Object> seedDemo() {
        if(repo.count()>0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Demo wardrobe can only be loaded when the closet is empty");
        createDemo("Oxford Button-Down","TOPS","#9DB8C6","Harbor",49.00,"Everyday cotton shirt");
        createDemo("Washed Linen Shirt","TOPS","#D4C6AC","Common Thread",38.00,"Breathable neutral layering piece");
        createDemo("Ribbed Knit Sweater","TOPS","#A98A73","Morrow",72.00,"Cold-weather staple");
        createDemo("Straight Leg Jeans","BOTTOMS","#506A83","Fieldnotes",68.00,"Mid-wash denim");
        createDemo("Tailored Trousers","BOTTOMS","#4E514B","Arden",84.00,"Versatile dark trousers");
        createDemo("Canvas Sneakers","FOOTWEAR","#ECE7DC","Everyday",65.00,"Comfortable casual shoes");
        createDemo("Leather Loafers","FOOTWEAR","#5B453C","Foundry",110.00,"Smart casual footwear");
        createDemo("Wool Overcoat","OUTERWEAR","#767365","North & Oak",185.00,"Warm outer layer");
        return Map.of("created", 8, "mode", "DEMO", "message", "Loaded eight clearly labeled sample garments");
    }
    private void createDemo(String name,String category,String color,String brand,double price,String notes){
        create(new GarmentRequest(name,category,color,brand,BigDecimal.valueOf(price),LocalDate.now().minusMonths(2),notes,null,null));
    }

    private void apply(Garment g,GarmentRequest form) {
        String category=form.category().trim().toUpperCase(Locale.ROOT);
        if(!CATEGORIES.contains(category)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported category: "+category);
        if(form.purchasedOn()!=null && form.purchasedOn().isAfter(LocalDate.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Purchase date cannot be in the future");
        g.setName(form.name().trim()); g.setCategory(category); g.setColor(form.color().toUpperCase(Locale.ROOT));
        g.setBrand(form.brand()==null?"":form.brand().trim()); g.setPurchasePrice(form.purchasePrice());
        g.setPurchasedOn(form.purchasedOn());g.setNotes(form.notes()==null?"":form.notes().trim());
        g.setSeason(choice(form.season(),"ALL_SEASONS",SEASONS,"season"));
        g.setOccasion(choice(form.occasion(),"EVERYDAY",OCCASIONS,"occasion"));
    }
    private static String choice(String input,String fallback,Set<String> allowed,String field) {
        String result=(input==null||input.isBlank())?fallback:input.trim().toUpperCase(Locale.ROOT);
        if(!allowed.contains(result)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid "+field+": "+result);
        return result;
    }
    private static String requireStatus(String status){
        if(status==null || !STATUSES.contains(status.toUpperCase(Locale.ROOT))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown clothing status");
        return status.toUpperCase(Locale.ROOT);
    }
}
