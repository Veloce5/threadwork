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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:plannertest;DB_CLOSE_DELAY=-1",
 "spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class PlannerControllerTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired GarmentRepository garments;
  @Autowired OutfitRepository outfits;
  @Autowired WearEventRepository wears;
  @Autowired OutfitPlanRepository calendar;
  @Autowired GarmentStatusEventRepository events;

  @BeforeEach void clear(){calendar.deleteAll();wears.deleteAll();outfits.deleteAll();events.deleteAll();garments.deleteAll();}
  long garment(String name,String category) throws Exception{
    String input=mapper.writeValueAsString(Map.of("name",name,"category",category,"color","#668899","purchasePrice",20));
    String json=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(input))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return mapper.readTree(json).get("id").asLong();
  }
  long outfit(String name,long... ids) throws Exception{
    String input=mapper.writeValueAsString(Map.of("name",name,"garmentIds",Arrays.stream(ids).boxed().toList(),"occasion","EVERYDAY"));
    String json=mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON).content(input))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return mapper.readTree(json).get("id").asLong();
  }
  String assign(LocalDate date,String slot,long outfitId) throws Exception{
    String input=mapper.writeValueAsString(Map.of("date",date.toString(),"slot",slot,"outfitId",outfitId));
    return mvc.perform(put("/api/planner/calendar").contentType(MediaType.APPLICATION_JSON).content(input))
      .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  }
  @Test void calendarPersistsReplacesSlotAndReportsSharedPieces() throws Exception{
    long top=garment("Top","TOPS"),bottom=garment("Bottom","BOTTOMS"),shoe=garment("Shoe","FOOTWEAR");
    long a=outfit("First look",top,bottom),b=outfit("Second look",top,shoe);
    LocalDate today=LocalDate.now().plusDays(1);
    long firstId=mapper.readTree(assign(today,"MORNING",a)).get("id").asLong();
    assign(today,"EVENING",b);
    mvc.perform(get("/api/planner/calendar").param("start",today.toString()).param("end",today.toString()))
      .andExpect(jsonPath("$.length()").value(2))
      .andExpect(jsonPath("$[0].warnings[0]").exists());
    long updatedId=mapper.readTree(assign(today,"MORNING",b)).get("id").asLong();
    Assertions.assertEquals(firstId,updatedId);
    mvc.perform(get("/api/planner/calendar").param("start",today.toString()).param("end",today.toString()))
      .andExpect(jsonPath("$.length()").value(2));
    mvc.perform(patch("/api/garments/"+top+"/status").contentType(MediaType.APPLICATION_JSON)
      .content("{\"status\":\"LAUNDRY\"}")).andExpect(status().isOk());
    mvc.perform(get("/api/planner/calendar").param("start",today.toString()).param("end",today.toString()))
      .andExpect(jsonPath("$[0].usableNow").value(false));
    mvc.perform(delete("/api/planner/calendar/"+firstId)).andExpect(status().isNoContent());
  }
  @Test void packingMinimizesUniquePiecesAndDoesNotInventLaundryAvailability() throws Exception{
    garment("Top","TOPS");garment("Bottom","BOTTOMS");long shoe=garment("Shoes","FOOTWEAR");
    String body="{\"occasions\":[\"EVERYDAY\",\"WORK\",\"EVERYDAY\"],\"season\":\"ALL_SEASONS\",\"requireLayer\":false}";
    mvc.perform(post("/api/planner/packing").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isOk()).andExpect(jsonPath("$.days.length()").value(3))
      .andExpect(jsonPath("$.totalItems").value(3))
      .andExpect(jsonPath("$.assumptions[1]").exists());
    mvc.perform(patch("/api/garments/"+shoe+"/status").contentType(MediaType.APPLICATION_JSON)
      .content("{\"status\":\"LAUNDRY\"}")).andExpect(status().isOk());
    mvc.perform(post("/api/planner/packing").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(jsonPath("$.days.length()").value(0))
      .andExpect(jsonPath("$.blockers[0]").exists());
    mvc.perform(post("/api/planner/packing").contentType(MediaType.APPLICATION_JSON)
      .content("{\"occasions\":[],\"season\":\"SUMMER\"}")).andExpect(status().isBadRequest());
  }
}
