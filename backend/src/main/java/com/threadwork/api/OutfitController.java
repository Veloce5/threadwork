package com.threadwork.api;

import com.threadwork.model.*;
import com.threadwork.service.OutfitService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/outfits")
public class OutfitController {
    private final OutfitService service;
    public OutfitController(OutfitService service){this.service=service;}
    @GetMapping public List<OutfitView> list(){return service.list();}
    @GetMapping("/{id}") public OutfitView get(@PathVariable long id){return service.get(id);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public OutfitView create(@Valid @RequestBody OutfitRequest input){return service.create(input);}
    @PutMapping("/{id}") public OutfitView update(@PathVariable long id,@Valid @RequestBody OutfitRequest input){return service.update(id,input);}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id){service.delete(id);}
}
