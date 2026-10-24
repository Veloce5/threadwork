package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.*;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:recommendationtest;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class RecommendationControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired GarmentRepository garments;
    @Autowired WearEventRepository wears;
    @Autowired OutfitRepository outfits;
    @Autowired GarmentStatusEventRepository events;
    @BeforeEach void clear(){wears.deleteAll();outfits.deleteAll();events.deleteAll();garments.deleteAll();}
    long add(String name,String category,String occasion,String season) throws Exception {
        String body=mapper.writeValueAsString(Map.of("name",name,"category",category,"color","#668899",
            "purchasePrice",40,"occasion",occasion,"season",season));
        String response=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON)
            .content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("id").asLong();
    }
    @Test void neverSuggestsLaundryAndExplainsEmptyState() throws Exception {
        add("Top","TOPS","EVERYDAY","ALL_SEASONS");
        add("Bottom","BOTTOMS","EVERYDAY","ALL_SEASONS");
        mvc.perform(get("/api/recommendations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.suggestions.length()").value(0))
            .andExpect(jsonPath("$.blockers[0]").exists());
        long shoes=add("Shoes","FOOTWEAR","EVERYDAY","ALL_SEASONS");
        mvc.perform(get("/api/recommendations")).andExpect(jsonPath("$.suggestions.length()").value(1))
            .andExpect(jsonPath("$.suggestions[0].garmentIds.length()").value(3))
            .andExpect(jsonPath("$.suggestions[0].reasons[0]").value("Every garment is currently marked Available."));
        mvc.perform(patch("/api/garments/"+shoes+"/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"LAUNDRY\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/recommendations")).andExpect(jsonPath("$.suggestions.length()").value(0));
    }
    @Test void ranksByOccasionAndRequiresLayerWhenRequested() throws Exception {
        long match=add("Formal shirt","TOPS","FORMAL","WINTER");
        add("Casual shirt","TOPS","EVERYDAY","SUMMER");
        add("Trousers","BOTTOMS","FORMAL","ALL_SEASONS");
        add("Loafers","FOOTWEAR","FORMAL","ALL_SEASONS");
        mvc.perform(get("/api/recommendations").param("occasion","FORMAL").param("season","WINTER"))
            .andExpect(jsonPath("$.suggestions.length()").value(2))
            .andExpect(jsonPath("$.suggestions[0].garmentIds[0]").value(match));
        mvc.perform(get("/api/recommendations").param("occasion","FORMAL").param("requireLayer","true"))
            .andExpect(jsonPath("$.blockers[0]").exists());
        add("Coat","OUTERWEAR","FORMAL","WINTER");
        mvc.perform(get("/api/recommendations").param("occasion","FORMAL").param("requireLayer","true"))
            .andExpect(jsonPath("$.suggestions[0].garmentIds.length()").value(4));
    }
    @Test void supportsDressButValidatesInputs() throws Exception {
        add("Dress","DRESSES","EVERYDAY","SUMMER");
        add("Shoes","FOOTWEAR","EVERYDAY","SUMMER");
        mvc.perform(get("/api/recommendations").param("season","SUMMER"))
            .andExpect(jsonPath("$.suggestions[0].garmentIds.length()").value(2));
        mvc.perform(get("/api/recommendations").param("limit","50")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/recommendations").param("occasion","FAKE")).andExpect(status().isBadRequest());
    }
}
