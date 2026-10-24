package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:outfittest;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class OutfitControllerTest {
    @Autowired MockMvc mvc;
    @Autowired GarmentRepository garments;
    @Autowired OutfitRepository outfits;
    @Autowired ObjectMapper mapper;

    @BeforeEach void clean(){outfits.deleteAll();garments.deleteAll();}
    private long add(String name) throws Exception {
        String body=mapper.writeValueAsString(java.util.Map.of("name",name,"category","TOPS","color","#668899","purchasePrice",20));
        String result=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(body))
           .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(result).get("id").asLong();
    }
    @Test void createsSavesAndTracksAvailability() throws Exception {
        long top=add("Shirt"),bottom=add("Pants");
        String input=mapper.writeValueAsString(java.util.Map.of("name","Everyday pair","garmentIds",java.util.List.of(top,bottom),"occasion","EVERYDAY"));
        String response=mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON).content(input))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.available").value(true))
            .andReturn().getResponse().getContentAsString();
        long id=mapper.readTree(response).get("id").asLong();
        mvc.perform(get("/api/summary")).andExpect(jsonPath("$.savedOutfits").value(1));
        mvc.perform(patch("/api/garments/"+bottom+"/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LAUNDRY\"}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/outfits/"+id)).andExpect(jsonPath("$.available").value(false))
            .andExpect(jsonPath("$.warnings.length()").value(1));
        mvc.perform(delete("/api/garments/"+top)).andExpect(status().isNoContent());
        mvc.perform(get("/api/outfits/"+id)).andExpect(jsonPath("$.available").value(false))
            .andExpect(jsonPath("$.warnings.length()").value(2));
        mvc.perform(delete("/api/outfits/"+id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/summary")).andExpect(jsonPath("$.savedOutfits").value(0));
    }
    @Test void validatesMissingAndDuplicatePieces() throws Exception {
        long top=add("Shirt");
        mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"bad\",\"garmentIds\":["+top+","+top+"]}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/outfits").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"bad\",\"garmentIds\":["+top+",999999]}"))
            .andExpect(status().isBadRequest());
    }
}
