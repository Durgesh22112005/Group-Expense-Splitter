package com.groupexpensesplitter.repository;

import com.groupexpensesplitter.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByEventId(Long eventId);

    @Query("SELECT e FROM Expense e WHERE e.id = :expenseId AND e.event.id = :eventId")
    Optional<Expense> findByIdAndEventId(@Param("expenseId") Long expenseId, @Param("eventId") Long eventId);

    /** Count expenses for an event — used as stale-settlement snapshot. */
    long countByEventId(Long eventId);
}
