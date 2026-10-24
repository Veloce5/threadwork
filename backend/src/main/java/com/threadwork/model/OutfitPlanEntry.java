package com.threadwork.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name="outfit_plan_entries",uniqueConstraints=@UniqueConstraint(name="uq_outfit_plan_date_slot",columnNames={"planned_date","day_slot"}))
public class OutfitPlanEntry {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(name="planned_date",nullable=false) private LocalDate date;
  @Column(name="day_slot",nullable=false,length=16) private String slot;
  @Column(name="outfit_id",nullable=false) private Long outfitId;
  @Column(nullable=false) private Instant updatedAt;

  protected OutfitPlanEntry(){}
  public OutfitPlanEntry(LocalDate date,String slot,Long outfitId){this.date=date;this.slot=slot;this.outfitId=outfitId;}
  @PrePersist @PreUpdate void touch(){updatedAt=Instant.now();}
  public Long getId(){return id;}
  public LocalDate getDate(){return date;}
  public String getSlot(){return slot;}
  public Long getOutfitId(){return outfitId;}
  public void setOutfitId(Long id){outfitId=id;}
  public Instant getUpdatedAt(){return updatedAt;}
}
