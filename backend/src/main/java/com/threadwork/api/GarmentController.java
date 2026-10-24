package com.threadwork.api;

import com.threadwork.model.*;
import com.threadwork.service.GarmentService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class GarmentController {
    private final GarmentService service;
    public GarmentController(GarmentService service){this.service=service;}

    @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok","app","THREADWORK","phase","1");}
    @GetMapping("/garments") public List<Garment> list(){return service.list();}
    @GetMapping("/garments/{id}") public Garment get(@PathVariable long id){return service.find(id);}
    @PostMapping("/garments") @ResponseStatus(HttpStatus.CREATED)
    public Garment create(@Valid @RequestBody GarmentRequest request){return service.create(request);}
    @PutMapping("/garments/{id}") public Garment update(@PathVariable long id,@Valid @RequestBody GarmentRequest request){return service.update(id,request);}
    public record StatusRequest(String status) {}
    @PatchMapping("/garments/{id}/status") public Garment status(@PathVariable long id,@RequestBody StatusRequest request){return service.changeStatus(id,request.status());}
    @DeleteMapping("/garments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable long id){service.delete(id);}
    @GetMapping("/summary") public Map<String,Object> summary(){return service.summary();}
    @PostMapping("/demo/seed") public Map<String,Object> seed(){return service.seedDemo();}
}
