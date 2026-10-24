package com.threadwork.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="wear_events")
public class WearEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private LocalDate wornOn;
    private Long outfitId;
    @Column(length=80) private String outfitName;
    @Column(length=200) private String notes="";
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="wear_event_garments",joinColumns=@JoinColumn(name="wear_event_id"))
    @OrderColumn(name="item_position")
    @Column(name="garment_id",nullable=false)
    private List<Long> garmentIds=new ArrayList<>();
    @Column(nullable=false,updatable=false) private Instant createdAt;

    protected WearEvent(){}
    public WearEvent(LocalDate wornOn,Long outfitId,String outfitName,String notes,List<Long> garmentIds){
        this.wornOn=wornOn;this.outfitId=outfitId;this.outfitName=outfitName;
        this.notes=notes;this.garmentIds=new ArrayList<>(garmentIds);
    }
    @PrePersist public void insert(){if(createdAt==null)createdAt=Instant.now();}
    public Long getId(){return id;}
    public LocalDate getWornOn(){return wornOn;}
    public Long getOutfitId(){return outfitId;}
    public String getOutfitName(){return outfitName;}
    public String getNotes(){return notes;}
    public List<Long> getGarmentIds(){return garmentIds;}
    public Instant getCreatedAt(){return createdAt;}
}
