package com.threadwork.repo;

import com.threadwork.model.WearEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WearEventRepository extends JpaRepository<WearEvent,Long> {
    /** Counts dated wear events containing a garment without loading the whole history. */
    @Query("select count(e) from WearEvent e where :garmentId member of e.garmentIds")
    long countByGarmentId(@Param("garmentId") Long garmentId);
}
