package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:laundrytest;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class LaundryWorkflowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired GarmentRepository garments;
    @Autowired OutfitRepository outfits;
    @Autowired GarmentStatusEventRepository events;
    @BeforeEach void clean(){outfits.deleteAll();events.deleteAll();garments.deleteAll();}
    long add(String name,String category) throws Exception {
        String input=mapper.writeValueAsString(Map.of("name",name,"category",category,"color","#668899","purchasePrice",40));
        String response=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(input))
          .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("id").asLong();
    }
    void move(long id,String to,int expectedStatus) throws Exception {
        mvc.perform(post("/api/laundry/"+id+"/transition").contentType(MediaType.APPLICATION_JSON)
            .content("{\"to\":\""+to+"\"}")).andExpect(status().is(expectedStatus));
    }
    @Test void movesAcrossStagesAndRecordsHistory() throws Exception {
        long shirt=add("Shirt","TOPS");
        move(shirt,"WORN",200);
        move(shirt,"LAUNDRY",200);
        move(shirt,"DRYING",200);
        move(shirt,"AVAILABLE",200);
        mvc.perform(get("/api/laundry/history")).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].fromStatus").value("DRYING"))
            .andExpect(jsonPath("$[0].toStatus").value("AVAILABLE"))
            .andExpect(jsonPath("$[0].origin").value("LAUNDRY_WORKFLOW"));
        move(shirt,"DRYING",400);
        mvc.perform(patch("/api/garments/"+shirt+"/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"REPAIR\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/laundry/history")).andExpect(jsonPath("$[0].origin").value("MANUAL"));
    }
    @Test void suggestsAvailableSameCategoryReplacementsWithoutEditingSavedLook() throws Exception {
        long shirt=add("Original top","TOPS"),alternative=add("Backup top","TOPS"),trousers=add("Trousers","BOTTOMS");
        String input=mapper.writeValueAsString(Map.of("name","Everyday look","garmentIds",List.of(shirt,trousers),"occasion","EVERYDAY"));
        String result=mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON).content(input))
          .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long outfitId=mapper.readTree(result).get("id").asLong();
        move(shirt,"LAUNDRY",200);
        mvc.perform(get("/api/outfits/"+outfitId)).andExpect(jsonPath("$.available").value(false));
        mvc.perform(get("/api/laundry/outfits/"+outfitId+"/alternatives"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$[0].garmentId").value(shirt))
          .andExpect(jsonPath("$[0].alternatives[0].id").value(alternative));
        mvc.perform(get("/api/outfits/"+outfitId)).andExpect(jsonPath("$.garmentIds[0]").value(shirt));
    }
}
