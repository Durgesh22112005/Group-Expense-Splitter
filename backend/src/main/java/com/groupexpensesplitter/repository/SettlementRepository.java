package com.groupexpensesplitter.repository;

import com.groupexpensesplitter.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByEventId(Long eventId);

    /** Delete all PENDING settlements for an event (called when expenses change). */
    void deleteByEventIdAndStatus(Long eventId, Settlement.Status status);

    /** Check if any PENDING settlements exist for an event. */
    boolean existsByEventIdAndStatus(Long eventId, Settlement.Status status);
}
