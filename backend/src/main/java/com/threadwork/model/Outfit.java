package com.threadwork.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="saved_outfits")
public class Outfit {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false,length=80) private String name;
    @Column(nullable=false,length=20) private String occasion="EVERYDAY";
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="saved_outfit_items", joinColumns=@JoinColumn(name="outfit_id"))
    @OrderColumn(name="item_position")
    @Column(name="garment_id", nullable=false)
    private List<Long> garmentIds = new ArrayList<>();
    @Column(nullable=false,updatable=false) private Instant createdAt;
    @PrePersist public void onCreate(){if(createdAt==null)createdAt=Instant.now();}
    public Long getId(){return id;}
    public String getName(){return name;} public void setName(String x){name=x;}
    public String getOccasion(){return occasion;} public void setOccasion(String x){occasion=x;}
    public List<Long> getGarmentIds(){return garmentIds;} public void setGarmentIds(List<Long> x){garmentIds=new ArrayList<>(x);}
    public Instant getCreatedAt(){return createdAt;}
}
