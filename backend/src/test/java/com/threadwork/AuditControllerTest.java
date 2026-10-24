package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.*;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={
  "spring.datasource.url=jdbc:h2:mem:audittest;DB_CLOSE_DELAY=-1",
  "spring.jpa.hibernate.ddl-auto=create-drop",
  "threadwork.upload-dir=./data/test-photos"
})
@AutoConfigureMockMvc
class AuditControllerTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired WearEventRepository wears;
  @Autowired OutfitPlanRepository plans;
  @Autowired OutfitRepository outfits;
  @Autowired GarmentStatusEventRepository statusEvents;
  @Autowired GarmentRepository garments;

  @BeforeEach void reset(){
    plans.deleteAll();wears.deleteAll();outfits.deleteAll();statusEvents.deleteAll();garments.deleteAll();
  }
  private long add(String name) throws Exception {
    String input=mapper.writeValueAsString(Map.of("name",name,"category","TOPS","color","#778899","purchasePrice",20));
    String data=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(input))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return mapper.readTree(data).get("id").asLong();
  }
  @Test void reportsHealthyAndAccurateCounts() throws Exception {
    long id=add("Shirt");
    mvc.perform(get("/api/system/audit")).andExpect(status().isOk())
      .andExpect(jsonPath("$.passed").value(true))
      .andExpect(jsonPath("$.totals.garments").value(1))
      .andExpect(jsonPath("$.totals.attachedPhotos").value(0))
      .andExpect(jsonPath("$.issues.length()").value(0));
    mvc.perform(post("/api/wears").contentType(MediaType.APPLICATION_JSON)
      .content("{\"garmentIds\":["+id+"]}")).andExpect(status().isCreated());
    mvc.perform(get("/api/system/audit")).andExpect(jsonPath("$.passed").value(true))
      .andExpect(jsonPath("$.totals.wearEvents").value(1));
  }
  @Test void detectsDerivedWearCountMismatch() throws Exception {
    long id=add("Shirt");
    var item=garments.findById(id).orElseThrow();
    item.setWearCount(5);
    garments.saveAndFlush(item);
    mvc.perform(get("/api/system/audit")).andExpect(status().isOk())
      .andExpect(jsonPath("$.passed").value(false))
      .andExpect(jsonPath("$.issues[0].code").value("WEAR_COUNT_MISMATCH"));
  }
  @Test void warnsOnDeletedOutfitPieceWithoutCrashing() throws Exception {
    long top=add("Top"),bottom=add("Bottom");
    mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON)
      .content("{\"name\":\"Weekday\",\"garmentIds\":["+top+","+bottom+"]}"))
      .andExpect(status().isCreated());
    mvc.perform(delete("/api/garments/"+top)).andExpect(status().isNoContent());
    mvc.perform(get("/api/system/audit")).andExpect(status().isOk())
      .andExpect(jsonPath("$.passed").value(true))
      .andExpect(jsonPath("$.issues[0].code").value("OUTFIT_PIECE_REMOVED"));
  }
}
