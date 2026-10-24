package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:weartest;DB_CLOSE_DELAY=-1",
  "spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class WearControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired WearEventRepository wears;
    @Autowired OutfitRepository outfits;
    @Autowired GarmentStatusEventRepository statuses;
    @Autowired GarmentRepository garments;
    @BeforeEach void cleanup(){wears.deleteAll();outfits.deleteAll();statuses.deleteAll();garments.deleteAll();}
    private long add(String name,int price) throws Exception {
        String payload=mapper.writeValueAsString(Map.of("name",name,"category","TOPS","color","#668899","purchasePrice",price));
        String response=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("id").asLong();
    }
    @Test void logsWearAndDerivesAccurateCostWithoutInventedZero() throws Exception {
        long id=add("Shirt",60),unworn=add("New shirt",30);
        mvc.perform(get("/api/wears/analytics")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].costPerWear").doesNotExist());
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"garmentIds\":["+id+"],\"notes\":\"Class\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.garmentIds[0]").value(id));
        mvc.perform(get("/api/garments/"+id)).andExpect(jsonPath("$.wearCount").value(1))
            .andExpect(jsonPath("$.status").value("WORN"));
        mvc.perform(get("/api/wears/analytics")).andExpect(jsonPath("$.totalWearEvents").value(1))
            .andExpect(jsonPath("$.wornPieces").value(1))
            .andExpect(jsonPath("$.neverLoggedPieces").value(1))
            .andExpect(jsonPath("$.items[0].costPerWear").value(60))
            .andExpect(jsonPath("$.items[1].costPerWear").doesNotExist());
        String older=LocalDate.now().minusDays(1).toString();
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"garmentIds\":["+id+"],\"wornOn\":\""+older+"\"}"))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/wears/analytics")).andExpect(jsonPath("$.items[0].costPerWear").value(30))
            .andExpect(jsonPath("$.totalWearEvents").value(2))
            .andExpect(jsonPath("$.garmentWears").value(2));
        mvc.perform(get("/api/garments/"+id)).andExpect(jsonPath("$.wearCount").value(2))
            .andExpect(jsonPath("$.status").value("WORN"));
    }
    @Test void logsSavedOutfitAndMarksEntireSetWorn() throws Exception {
        long first=add("Shirt",20),second=add("Second",40);
        String outfit=mapper.writeValueAsString(Map.of("name","First look","garmentIds",List.of(first,second)));
        String created=mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON)
            .content(outfit)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=mapper.readTree(created).get("id").asLong();
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"outfitId\":"+id+"}")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.outfitName").value("First look"));
        mvc.perform(get("/api/outfits/"+id)).andExpect(jsonPath("$.available").value(false));
        mvc.perform(get("/api/wears/analytics")).andExpect(jsonPath("$.garmentWears").value(2));
        mvc.perform(get("/api/laundry/history")).andExpect(jsonPath("$.length()").value(2));
    }
    @Test void rejectsInvalidFutureAndUnavailableToday() throws Exception {
        long id=add("Shirt",20);
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"garmentIds\":["+id+"],\"wornOn\":\""+LocalDate.now().plusDays(1)+"\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"garmentIds\":["+id+","+id+"]}")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/garments/"+id+"/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"LAUNDRY\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
            .content("{\"garmentIds\":["+id+"]}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/wears")).andExpect(jsonPath("$.length()").value(0));
    }
}
