package com.threadwork.api;

import com.threadwork.model.*;
import com.threadwork.service.PlannerService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/planner")
public class PlannerController {
  private final PlannerService planner;
  public PlannerController(PlannerService planner){this.planner=planner;}
  @GetMapping("/calendar")
  public List<PlanView> calendar(@RequestParam LocalDate start,@RequestParam LocalDate end){
    return planner.calendar(start,end);
  }
  @PutMapping("/calendar")
  public PlanView assign(@RequestBody PlannerService.Assignment request){return planner.assign(request);}
  @DeleteMapping("/calendar/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id){planner.delete(id);}
  @PostMapping("/packing")
  public PackingResult pack(@RequestBody PackingRequest request){return planner.pack(request);}
}
