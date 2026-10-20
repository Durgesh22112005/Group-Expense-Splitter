package com.groupexpensesplitter.service;

import com.groupexpensesplitter.dto.BalanceResponse;
import com.groupexpensesplitter.entity.Expense;
import com.groupexpensesplitter.entity.ExpenseShare;
import com.groupexpensesplitter.entity.Participant;
import com.groupexpensesplitter.repository.ExpenseRepository;
import com.groupexpensesplitter.repository.ParticipantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Calculates per-participant net balances for an event.
 *
 * <p>Algorithm:
 * <ol>
 *   <li>For each expense in the event, add the full amount to the payer's "paid" bucket.</li>
 *   <li>For each expense share, add the share amount to the beneficiary's "owed" bucket.</li>
 *   <li>Net Balance = Paid - Owed</li>
 * </ol>
 *
 * <p>The sum of all net balances is guaranteed to be zero for any event.
 */
@Service
@Transactional(readOnly = true)
public class BalanceService {

    private final ParticipantRepository participantRepository;
    private final ExpenseRepository expenseRepository;

    public BalanceService(ParticipantRepository participantRepository,
                          ExpenseRepository expenseRepository) {
        this.participantRepository = participantRepository;
        this.expenseRepository = expenseRepository;
    }

    /**
     * Returns the net balance for every participant in the event.
     *
     * @param eventId target event
     * @return list of balance responses; one entry per participant
     */
    public List<BalanceResponse> getBalances(Long eventId) {
        List<Participant> participants = participantRepository.findByEventId(eventId);
        List<Expense> expenses = expenseRepository.findByEventId(eventId);

        // Initialize accumulators for each participant
        Map<Long, BigDecimal> paid = new HashMap<>();
        Map<Long, BigDecimal> owed = new HashMap<>();

        for (Participant p : participants) {
            paid.put(p.getId(), BigDecimal.ZERO);
            owed.put(p.getId(), BigDecimal.ZERO);
        }

        for (Expense expense : expenses) {
            Long payerId = expense.getPayer().getId();
            // Only accumulate if the payer is still a participant in this event
            if (paid.containsKey(payerId)) {
                paid.merge(payerId, expense.getAmount(), BigDecimal::add);
            }

            for (ExpenseShare share : expense.getShares()) {
                Long beneficiaryId = share.getParticipant().getId();
                if (owed.containsKey(beneficiaryId)) {
                    owed.merge(beneficiaryId, share.getShareAmount(), BigDecimal::add);
                }
            }
        }

        List<BalanceResponse> result = new ArrayList<>();
        for (Participant p : participants) {
            BigDecimal totalPaid = paid.getOrDefault(p.getId(), BigDecimal.ZERO);
            BigDecimal totalOwed = owed.getOrDefault(p.getId(), BigDecimal.ZERO);
            BigDecimal netBalance = totalPaid.subtract(totalOwed);
            result.add(new BalanceResponse(p.getId(), p.getName(), totalPaid, totalOwed, netBalance));
        }

        return result;
    }
}
