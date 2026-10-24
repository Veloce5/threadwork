package com.threadwork.api;

import com.threadwork.model.AuditReport;
import com.threadwork.service.AuditService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system")
public class AuditController {
  private final AuditService service;
  public AuditController(AuditService service){this.service=service;}
  @GetMapping("/audit")
  public AuditReport runAudit(){return service.run();}
}
