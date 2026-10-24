package com.threadwork;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:errtest;DB_CLOSE_DELAY=-1",
  "spring.jpa.hibernate.ddl-auto=create-drop","threadwork.upload-dir=./data/test-photos"})
@AutoConfigureMockMvc
class ApiErrorMessageTest {
    @Autowired MockMvc mvc;
    @Test void invalidGarmentReturnsReadableFieldMessage() throws Exception {
        mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\",\"category\":\"TOPS\",\"color\":\"red\",\"purchasePrice\":10}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("name")))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("color")));
    }
    @Test void malformedJsonReturnsFriendlyMessage() throws Exception {
        mvc.perform(post("/api/garments").contentType(MediaType.APPLICATION_JSON).content("{bad"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("could not be read")));
    }
}
