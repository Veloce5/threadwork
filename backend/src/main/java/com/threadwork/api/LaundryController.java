package com.threadwork.api;

import com.threadwork.model.*;
import com.threadwork.service.LaundryService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/laundry")
public class LaundryController {
    private final LaundryService laundry;
    public LaundryController(LaundryService laundry){this.laundry=laundry;}
    public record Transition(String to) {}
    @PostMapping("/{id}/transition")
    public Garment transition(@PathVariable long id,@RequestBody Transition request){
        return laundry.transition(id,request.to());
    }
    @GetMapping("/history") public List<GarmentStatusEvent> history(){return laundry.history();}
    @GetMapping("/outfits/{id}/alternatives")
    public List<OutfitAlternative> alternatives(@PathVariable long id){return laundry.alternatives(id);}
}
