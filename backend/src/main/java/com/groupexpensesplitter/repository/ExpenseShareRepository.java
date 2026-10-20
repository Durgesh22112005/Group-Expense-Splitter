package com.groupexpensesplitter.repository;

import com.groupexpensesplitter.entity.ExpenseShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ExpenseShareRepository extends JpaRepository<ExpenseShare, Long> {

    List<ExpenseShare> findByExpenseId(Long expenseId);

    /** Sum of share amounts for a participant across all expenses in an event. */
    @Query("""
           SELECT COALESCE(SUM(es.shareAmount), 0)
           FROM ExpenseShare es
           WHERE es.participant.id = :participantId
             AND es.expense.event.id = :eventId
           """)
    BigDecimal sumSharesByParticipantAndEvent(@Param("participantId") Long participantId,
                                              @Param("eventId") Long eventId);

    /** Checks whether a participant has any shares (to guard against orphaned share deletion). */
    boolean existsByParticipantId(Long participantId);
}
