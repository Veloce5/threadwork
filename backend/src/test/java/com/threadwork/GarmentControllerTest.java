package com.threadwork;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.threadwork.repo.GarmentRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:threadworktest;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class GarmentControllerTest {
    @Autowired MockMvc mvc;
    @Autowired GarmentRepository repo;
    @Autowired ObjectMapper mapper;
    @BeforeEach void reset(){repo.deleteAll();}

    @Test void createsPersistsAndUpdatesStatus() throws Exception {
        String body="{\"name\":\"Blue Shirt\",\"category\":\"TOPS\",\"color\":\"#4477AA\",\"purchasePrice\":\"45.00\"}";
        String response=mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Blue Shirt"))
            .andReturn().getResponse().getContentAsString();
        Long id=mapper.readTree(response).get("id").asLong();
        mvc.perform(patch("/api/garments/"+id+"/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"LAUNDRY\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LAUNDRY"));
        mvc.perform(get("/api/summary")).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.laundryItems").value(1));
    }
    @Test void rejectsInvalidItem() throws Exception {
        mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\",\"category\":\"TOPS\",\"color\":\"orange\",\"purchasePrice\":-3}"))
            .andExpect(status().isBadRequest());
    }
}
