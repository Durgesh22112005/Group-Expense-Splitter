package com.groupexpensesplitter.service;

import com.groupexpensesplitter.dto.BalanceResponse;
import com.groupexpensesplitter.dto.SettlementResponse;
import com.groupexpensesplitter.entity.*;
import com.groupexpensesplitter.exception.BusinessRuleException;
import com.groupexpensesplitter.exception.ResourceNotFoundException;
import com.groupexpensesplitter.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Settlement service — generates minimal transfer suggestions and handles completion.
 *
 * <h3>Settlement generation strategy:</h3>
 * <ol>
 *   <li>Compute net balances using {@link BalanceService}.</li>
 *   <li>Separate participants into debtors (negative balance) and creditors (positive balance).</li>
 *   <li>Use a greedy matching loop: pick the largest debtor and largest creditor, create a transfer
 *       for min(|debtor balance|, creditor balance), and reduce both balances accordingly.</li>
 *   <li>Persist the generated settlements as PENDING records.</li>
 * </ol>
 *
 * <h3>Duplicate-prevention strategy:</h3>
 * <ul>
 *   <li>Before generating new suggestions, all existing PENDING settlements for the event
 *       are deleted and replaced. COMPLETED settlements are never touched.</li>
 *   <li>Any expense change (create/update/delete) already clears PENDING settlements
 *       via {@link ExpenseService}. Calling the settlements endpoint re-generates fresh ones.</li>
 * </ul>
 */
@Service
@Transactional
public class SettlementService {

    private static final int SCALE = 2;
    private static final BigDecimal THRESHOLD = new BigDecimal("0.01");

    private final SettlementRepository settlementRepository;
    private final ParticipantRepository participantRepository;
    private final ExpenseRepository expenseRepository;
    private final BalanceService balanceService;
    private final EventService eventService;

    public SettlementService(SettlementRepository settlementRepository,
                             ParticipantRepository participantRepository,
                             ExpenseRepository expenseRepository,
                             BalanceService balanceService,
                             EventService eventService) {
        this.settlementRepository = settlementRepository;
        this.participantRepository = participantRepository;
        this.expenseRepository = expenseRepository;
        this.balanceService = balanceService;
        this.eventService = eventService;
    }

    // -------------------------------------------------------------------------
    // Generate settlements
    // -------------------------------------------------------------------------

    /**
     * Returns the current list of suggested settlements for the event.
     *
     * <p>Calling this endpoint is safe to repeat: existing PENDING settlements are replaced,
     * COMPLETED ones are preserved.
     *
     * @return list of settlement response DTOs (PENDING + COMPLETED)
     */
    public List<SettlementResponse> getSettlements(Long eventId) {
        Event event = eventService.findEventOrThrow(eventId);

        List<BalanceResponse> balances = balanceService.getBalances(eventId);

        // Clear old PENDING suggestions and regenerate
        settlementRepository.deleteByEventIdAndStatus(eventId, Settlement.Status.PENDING);

        // snapshot: how many expenses exist right now (for staleness detection)
        long expenseCount = expenseRepository.countByEventId(eventId);

        // Build lookup: participantId → Participant entity
        Map<Long, Participant> participantMap = participantRepository.findByEventId(eventId).stream()
                .collect(Collectors.toMap(Participant::getId, p -> p));

        // Greedy debtor-creditor matching
        List<Settlement> generated = generateSettlements(event, balances, participantMap, (int) expenseCount);

        settlementRepository.saveAll(generated);

        // Return all settlements (PENDING + COMPLETED) for the event
        return settlementRepository.findByEventId(eventId).stream()
                .map(SettlementResponse::from)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Complete a settlement
    // -------------------------------------------------------------------------

    /**
     * Marks a PENDING settlement as COMPLETED.
     *
     * <p>Guards:
     * <ul>
     *   <li>The settlement must exist.</li>
     *   <li>The settlement must be PENDING (reject duplicate completions).</li>
     *   <li>The expense count at the time of completion must match the snapshot stored
     *       when the settlement was generated — if expenses changed, the settlement is stale.</li>
     * </ul>
     *
     * @param settlementId ID of the settlement to complete
     * @return updated settlement DTO
     */
    public SettlementResponse completeSettlement(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Settlement not found with id: " + settlementId));

        if (settlement.getStatus() == Settlement.Status.COMPLETED) {
            throw new BusinessRuleException(
                    "Settlement " + settlementId + " is already completed.");
        }

        // Staleness check: compare snapshot expense count with current count
        long currentExpenseCount = expenseRepository.countByEventId(settlement.getEvent().getId());
        if (currentExpenseCount != settlement.getSnapshotExpenseCount()) {
            throw new BusinessRuleException(
                    "Settlement " + settlementId + " is stale — expenses have changed since it was generated. " +
                    "Please refresh settlements and try again.");
        }

        settlement.setStatus(Settlement.Status.COMPLETED);
        settlement.setCompletedAt(LocalDateTime.now());
        return SettlementResponse.from(settlementRepository.save(settlement));
    }

    // -------------------------------------------------------------------------
    // Private: greedy algorithm
    // -------------------------------------------------------------------------

    private List<Settlement> generateSettlements(Event event,
                                                 List<BalanceResponse> balances,
                                                 Map<Long, Participant> participantMap,
                                                 int expenseCount) {
        // Use mutable copies of net balances (all scaled to 2 dp)
        // Negative = owes money, Positive = gets money back
        List<long[]> debtors = new ArrayList<>();   // [participantId, balance in cents]
        List<long[]> creditors = new ArrayList<>();  // [participantId, balance in cents]

        for (BalanceResponse b : balances) {
            // Convert to cents for integer arithmetic to avoid rounding issues
            long cents = b.getNetBalance().multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP).longValue();
            if (cents < 0) {
                debtors.add(new long[]{b.getParticipantId(), -cents}); // store positive
            } else if (cents > 0) {
                creditors.add(new long[]{b.getParticipantId(), cents});
            }
            // cents == 0 → already settled, skip
        }

        List<Settlement> result = new ArrayList<>();

        int di = 0, ci = 0;
        while (di < debtors.size() && ci < creditors.size()) {
            long[] debtor = debtors.get(di);
            long[] creditor = creditors.get(ci);

            long transferCents = Math.min(debtor[1], creditor[1]);

            if (transferCents > 0) {
                BigDecimal amount = BigDecimal.valueOf(transferCents)
                        .divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);

                Settlement s = new Settlement();
                s.setEvent(event);
                s.setPayer(participantMap.get(debtor[0]));
                s.setReceiver(participantMap.get(creditor[0]));
                s.setAmount(amount);
                s.setStatus(Settlement.Status.PENDING);
                s.setSnapshotExpenseCount(expenseCount);
                result.add(s);
            }

            debtor[1] -= transferCents;
            creditor[1] -= transferCents;

            if (debtor[1] == 0) di++;
            if (creditor[1] == 0) ci++;
        }

        return result;
    }
}
