package com.groupexpensesplitter.service;

import com.groupexpensesplitter.dto.ExpenseRequest;
import com.groupexpensesplitter.dto.ExpenseResponse;
import com.groupexpensesplitter.entity.*;
import com.groupexpensesplitter.exception.BusinessRuleException;
import com.groupexpensesplitter.exception.ResourceNotFoundException;
import com.groupexpensesplitter.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for expense management.
 *
 * <p>Key responsibilities:
 * <ul>
 *   <li>Create/update/delete expenses within an event</li>
 *   <li>Split expense amounts equally, with deterministic remainder distribution</li>
 *   <li>Invalidate stale PENDING settlements whenever expenses change</li>
 * </ul>
 */
@Service
@Transactional
public class ExpenseService {

    private static final int SCALE = 2;
    private static final BigDecimal CENT = new BigDecimal("0.01");

    private final ExpenseRepository expenseRepository;
    private final ParticipantRepository participantRepository;
    private final SettlementRepository settlementRepository;
    private final EventService eventService;
    private final ParticipantService participantService;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ParticipantRepository participantRepository,
                          SettlementRepository settlementRepository,
                          EventService eventService,
                          ParticipantService participantService) {
        this.expenseRepository = expenseRepository;
        this.participantRepository = participantRepository;
        this.settlementRepository = settlementRepository;
        this.eventService = eventService;
        this.participantService = participantService;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Creates an expense and calculates shares for the specified (or all) beneficiaries.
     * All PENDING settlements for the event are invalidated afterward.
     */
    public ExpenseResponse createExpense(Long eventId, ExpenseRequest request) {
        Event event = eventService.findEventOrThrow(eventId);

        // Validate payer belongs to this event
        Participant payer = participantService.findParticipantInEvent(request.getPayerId(), eventId);

        // Resolve beneficiaries
        List<Participant> beneficiaries = resolveBeneficiaries(request, eventId);

        // Build and save the expense (shares are populated before save)
        Expense expense = new Expense();
        expense.setDescription(request.getDescription().trim());
        expense.setCategory(request.getCategory().trim());
        expense.setAmount(request.getAmount().setScale(SCALE, RoundingMode.HALF_UP));
        expense.setExpenseDate(request.getExpenseDate());
        expense.setEvent(event);
        expense.setPayer(payer);
        expense.setReceiptUrl(request.getReceiptUrl());

        buildShares(expense, beneficiaries);

        Expense saved = expenseRepository.save(expense);

        // Invalidate stale settlements
        invalidatePendingSettlements(eventId);

        return ExpenseResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpenses(Long eventId) {
        eventService.findEventOrThrow(eventId);
        return expenseRepository.findByEventId(eventId).stream()
                .map(ExpenseResponse::from)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Replaces all fields and shares of an existing expense.
     * All PENDING settlements for the event are invalidated afterward.
     */
    public ExpenseResponse updateExpense(Long eventId, Long expenseId, ExpenseRequest request) {
        eventService.findEventOrThrow(eventId);

        Expense expense = expenseRepository.findByIdAndEventId(expenseId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Expense not found with id: " + expenseId + " in event: " + eventId));

        Participant payer = participantService.findParticipantInEvent(request.getPayerId(), eventId);
        List<Participant> beneficiaries = resolveBeneficiaries(request, eventId);

        expense.setDescription(request.getDescription().trim());
        expense.setCategory(request.getCategory().trim());
        expense.setAmount(request.getAmount().setScale(SCALE, RoundingMode.HALF_UP));
        expense.setExpenseDate(request.getExpenseDate());
        expense.setPayer(payer);
        expense.setReceiptUrl(request.getReceiptUrl());

        // Clear old shares and flush so orphan removal DELETEs run before new shares are inserted
        expense.getShares().clear();
        expenseRepository.flush();

        buildShares(expense, beneficiaries);

        Expense saved = expenseRepository.save(expense);

        invalidatePendingSettlements(eventId);

        return ExpenseResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes an expense and its shares. Invalidates PENDING settlements.
     */
    public void deleteExpense(Long eventId, Long expenseId) {
        eventService.findEventOrThrow(eventId);

        Expense expense = expenseRepository.findByIdAndEventId(expenseId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Expense not found with id: " + expenseId + " in event: " + eventId));

        expenseRepository.delete(expense);

        invalidatePendingSettlements(eventId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves the list of beneficiary participants.
     * If the request contains an explicit list of IDs, those are used.
     * Otherwise, all participants in the event are used.
     *
     * <p>All resolved participants must belong to the event.
     */
    private List<Participant> resolveBeneficiaries(ExpenseRequest request, Long eventId) {
        List<Long> ids = request.getBeneficiaryIds();

        if (ids == null || ids.isEmpty()) {
            // Split equally among all event participants
            List<Participant> all = participantRepository.findByEventId(eventId);
            if (all.isEmpty()) {
                throw new BusinessRuleException(
                        "Cannot create an expense for an event with no participants.");
            }
            return all;
        }

        // Validate and load each specified beneficiary
        List<Participant> result = new ArrayList<>();
        for (Long id : ids) {
            Participant p = participantService.findParticipantInEvent(id, eventId);
            result.add(p);
        }
        return result;
    }

    /**
     * Calculates equal shares for each beneficiary, distributing any cent-level remainder
     * deterministically to the first N beneficiaries so the total always equals the expense amount.
     *
     * <p>Example: ₹100 split 3 ways → ₹33.34, ₹33.33, ₹33.33.
     *
     * @param expense      the parent expense (shares are added to its collection)
     * @param beneficiaries ordered list of participants sharing the expense
     */
    private void buildShares(Expense expense, List<Participant> beneficiaries) {
        int n = beneficiaries.size();
        BigDecimal total = expense.getAmount();

        // Base share per person (floor to 2 dp)
        BigDecimal base = total.divide(BigDecimal.valueOf(n), SCALE, RoundingMode.DOWN);

        // How many people get one extra cent?
        BigDecimal distributed = base.multiply(BigDecimal.valueOf(n));
        BigDecimal remainder = total.subtract(distributed);
        long extraCents = remainder.divide(CENT, 0, RoundingMode.DOWN).longValue();

        for (int i = 0; i < n; i++) {
            BigDecimal share = (i < extraCents) ? base.add(CENT) : base;
            ExpenseShare es = new ExpenseShare(expense, beneficiaries.get(i), share);
            expense.getShares().add(es);
        }
    }

    /**
     * Removes all PENDING settlements for the event so they cannot be confused with
     * the current financial state after an expense change.
     */
    private void invalidatePendingSettlements(Long eventId) {
        settlementRepository.deleteByEventIdAndStatus(eventId, Settlement.Status.PENDING);
    }
}
