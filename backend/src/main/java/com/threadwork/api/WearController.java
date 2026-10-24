package com.threadwork.api;

import com.threadwork.model.*;
import com.threadwork.service.WearService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wears")
public class WearController {
    private final WearService service;
    public WearController(WearService service){this.service=service;}
    @GetMapping public List<WearEvent> history(){return service.history();}
    @GetMapping("/analytics") public WearAnalytics analytics(){return service.analytics();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public WearEvent log(@RequestBody WearLogRequest request){return service.log(request);}
}
