package com.threadwork.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record AuditReport(
  Instant checkedAt, String database, boolean passed,
  Map<String,Long> totals, List<Issue> issues
) {
  public record Issue(String severity, String code, String message) {}
}
