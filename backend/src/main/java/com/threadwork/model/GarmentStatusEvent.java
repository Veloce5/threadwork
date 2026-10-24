package com.threadwork.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="garment_status_events", indexes=@Index(name="idx_status_event_garment",columnList="garmentId"))
public class GarmentStatusEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long garmentId;
    @Column(nullable=false,length=100) private String garmentName;
    @Column(nullable=false,length=20) private String fromStatus;
    @Column(nullable=false,length=20) private String toStatus;
    @Column(nullable=false,length=24) private String origin;
    @Column(nullable=false,updatable=false) private Instant changedAt;

    protected GarmentStatusEvent() {}
    public GarmentStatusEvent(Long garmentId,String garmentName,String fromStatus,String toStatus,String origin){
        this.garmentId=garmentId;this.garmentName=garmentName;this.fromStatus=fromStatus;this.toStatus=toStatus;this.origin=origin;
    }
    @PrePersist void beforeInsert(){if(changedAt==null)changedAt=Instant.now();}
    public Long getId(){return id;}
    public Long getGarmentId(){return garmentId;}
    public String getGarmentName(){return garmentName;}
    public String getFromStatus(){return fromStatus;}
    public String getToStatus(){return toStatus;}
    public String getOrigin(){return origin;}
    public Instant getChangedAt(){return changedAt;}
}
