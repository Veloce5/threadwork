package com.threadwork.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "garments")
public class Garment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, length = 30) private String category;
    @Column(length = 60) private String brand = "";
    @Column(nullable = false, length = 7) private String color = "#8B988C";
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal purchasePrice = BigDecimal.ZERO;
    private LocalDate purchasedOn;
    @Column(nullable = false, length = 20) private String status = "AVAILABLE";
    @Column(nullable = false) private long wearCount = 0;
    @Column(length = 500) private String notes = "";
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'ALL_SEASONS'") private String season = "ALL_SEASONS";
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'EVERYDAY'") private String occasion = "EVERYDAY";
    @Column(length = 50) private String imageFile;
    @Column(nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { if(createdAt == null) createdAt = Instant.now(); }
    public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
    public String getCategory(){return category;} public void setCategory(String v){category=v;}
    public String getBrand(){return brand;} public void setBrand(String v){brand=v;}
    public String getColor(){return color;} public void setColor(String v){color=v;}
    public BigDecimal getPurchasePrice(){return purchasePrice;} public void setPurchasePrice(BigDecimal v){purchasePrice=v;}
    public LocalDate getPurchasedOn(){return purchasedOn;} public void setPurchasedOn(LocalDate v){purchasedOn=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public long getWearCount(){return wearCount;} public void setWearCount(long v){wearCount=v;}
    public String getNotes(){return notes;} public void setNotes(String v){notes=v;}
    public String getSeason(){return season;} public void setSeason(String v){season=v;}
    public String getOccasion(){return occasion;} public void setOccasion(String v){occasion=v;}
    @JsonIgnore public String getImageFile(){return imageFile;} public void setImageFile(String v){imageFile=v;}
    public String getImageUrl(){return imageFile==null?null:"/api/garments/"+id+"/photo?ref="+imageFile;}
    public Instant getCreatedAt(){return createdAt;}
}
